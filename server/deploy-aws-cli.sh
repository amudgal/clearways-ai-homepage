#!/bin/bash
# Deploy to AWS Elastic Beanstalk using AWS CLI
# This script creates the application, environment, and deploys the code

set -e

echo "🚀 ClearWays AI Backend - AWS CLI Deployment"
echo "=============================================="

# Configuration
APP_NAME="clearways-ai-backend"
ENV_NAME="clearways-ai-backend-env"
REGION="us-east-1"
PLATFORM="Node.js 18 running on 64bit Amazon Linux 2"
INSTANCE_TYPE="t3.small"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    echo "Install it from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI configured${NC}"

# Navigate to server directory
cd "$(dirname "$0")"
echo "📁 Working directory: $(pwd)"

# Build the application
echo "🔨 Building application..."
npm run build

# Create deployment package
echo "📦 Creating deployment package..."
rm -f deploy.zip
zip -r deploy.zip . \
    -x "node_modules/*" \
    -x ".git/*" \
    -x "*.log" \
    -x ".env" \
    -x "*.zip" \
    -x "dist/*.map" \
    -x ".ebextensions/nodecommand.config" \
    > /dev/null 2>&1

if [ ! -f "deploy.zip" ]; then
    echo -e "${RED}❌ Failed to create deployment package${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployment package created: deploy.zip ($(du -h deploy.zip | cut -f1))${NC}"

# Upload to S3
S3_BUCKET="elasticbeanstalk-${REGION}-$(aws sts get-caller-identity --query Account --output text)"
S3_KEY="clearways-backend/$(date +%Y%m%d-%H%M%S).zip"

echo "☁️  Uploading to S3..."
if aws s3 ls "s3://${S3_BUCKET}" &>/dev/null; then
    # Bucket exists, just upload
    aws s3 cp deploy.zip "s3://${S3_BUCKET}/${S3_KEY}" --region "${REGION}"
else
    # Bucket doesn't exist, create it without ACLs
    echo "Creating S3 bucket for Elastic Beanstalk (without ACLs)..."
    aws s3api create-bucket \
        --bucket "${S3_BUCKET}" \
        --region "${REGION}" \
        --create-bucket-configuration LocationConstraint="${REGION}" 2>/dev/null || \
    aws s3api create-bucket \
        --bucket "${S3_BUCKET}" \
        --region us-east-1 2>/dev/null || true
    
    # Disable ACLs and set public access block
    aws s3api put-public-access-block \
        --bucket "${S3_BUCKET}" \
        --public-access-block-configuration \
            "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
        2>/dev/null || true
    
    # Upload without ACL
    aws s3 cp deploy.zip "s3://${S3_BUCKET}/${S3_KEY}" --region "${REGION}" --no-acl
fi

echo -e "${GREEN}✅ Uploaded to s3://${S3_BUCKET}/${S3_KEY}${NC}"

# Check if application exists
echo "🔍 Checking if application exists..."
if aws elasticbeanstalk describe-applications \
    --application-names "${APP_NAME}" \
    --region "${REGION}" \
    --query 'Applications[0].ApplicationName' \
    --output text 2>/dev/null | grep -q "${APP_NAME}"; then
    echo -e "${YELLOW}⚠️  Application '${APP_NAME}' already exists${NC}"
else
    echo "📝 Creating application '${APP_NAME}'..."
    aws elasticbeanstalk create-application \
        --application-name "${APP_NAME}" \
        --description "Backend API for ClearWays AI TCO Analysis Platform" \
        --region "${REGION}"
    echo -e "${GREEN}✅ Application created${NC}"
fi

# Check if environment exists
echo "🔍 Checking if environment exists..."
ENV_EXISTS=$(aws elasticbeanstalk describe-environments \
    --application-name "${APP_NAME}" \
    --environment-names "${ENV_NAME}" \
    --region "${REGION}" \
    --query 'Environments[0].Status' \
    --output text 2>/dev/null || echo "None")

if [ "$ENV_EXISTS" != "None" ] && [ "$ENV_EXISTS" != "" ]; then
    echo -e "${YELLOW}⚠️  Environment '${ENV_NAME}' already exists. Updating...${NC}"
    
    # Create application version
    VERSION_LABEL="v$(date +%Y%m%d-%H%M%S)"
    echo "📦 Creating application version: ${VERSION_LABEL}"
    aws elasticbeanstalk create-application-version \
        --application-name "${APP_NAME}" \
        --version-label "${VERSION_LABEL}" \
        --source-bundle S3Bucket="${S3_BUCKET}",S3Key="${S3_KEY}" \
        --region "${REGION}"
    
    # Update environment
    echo "🚀 Deploying new version..."
    aws elasticbeanstalk update-environment \
        --application-name "${APP_NAME}" \
        --environment-name "${ENV_NAME}" \
        --version-label "${VERSION_LABEL}" \
        --region "${REGION}" \
        --output json > /tmp/eb-update.json
    
    echo -e "${GREEN}✅ Deployment initiated${NC}"
    echo "⏳ Waiting for deployment to complete (this may take 5-10 minutes)..."
    
    # Wait for deployment
    aws elasticbeanstalk wait environment-updated \
        --application-name "${APP_NAME}" \
        --environment-names "${ENV_NAME}" \
        --region "${REGION}" || true
    
    echo -e "${GREEN}✅ Deployment complete!${NC}"
else
    echo "📝 Creating environment '${ENV_NAME}'..."
    
    # Create application version first
    VERSION_LABEL="v$(date +%Y%m%d-%H%M%S)"
    echo "📦 Creating application version: ${VERSION_LABEL}"
    aws elasticbeanstalk create-application-version \
        --application-name "${APP_NAME}" \
        --version-label "${VERSION_LABEL}" \
        --source-bundle S3Bucket="${S3_BUCKET}",S3Key="${S3_KEY}" \
        --region "${REGION}"
    
    # Get available solution stacks (prefer Node.js 20 on Amazon Linux 2023)
    echo "🔍 Finding available Node.js solution stack..."
    SOLUTION_STACK=$(aws elasticbeanstalk list-available-solution-stacks \
        --region "${REGION}" \
        --query "SolutionStacks[?contains(@, 'Node.js 20') && contains(@, 'Amazon Linux 2023')]" \
        --output text | head -1)
    
    # Fallback to Node.js 22 if 20 not available
    if [ -z "$SOLUTION_STACK" ]; then
        SOLUTION_STACK=$(aws elasticbeanstalk list-available-solution-stacks \
            --region "${REGION}" \
            --query "SolutionStacks[?contains(@, 'Node.js 22') && contains(@, 'Amazon Linux 2023')]" \
            --output text | head -1)
    fi
    
    # Fallback to Node.js 24 if 22 not available
    if [ -z "$SOLUTION_STACK" ]; then
        SOLUTION_STACK=$(aws elasticbeanstalk list-available-solution-stacks \
            --region "${REGION}" \
            --query "SolutionStacks[?contains(@, 'Node.js 24') && contains(@, 'Amazon Linux 2023')]" \
            --output text | head -1)
    fi
    
    if [ -z "$SOLUTION_STACK" ]; then
        echo -e "${RED}❌ No suitable Node.js solution stack found${NC}"
        echo "Available stacks:"
        aws elasticbeanstalk list-available-solution-stacks \
            --region "${REGION}" \
            --query "SolutionStacks[?contains(@, 'Node.js')]" \
            --output text | head -5
        exit 1
    fi
    
    echo "📋 Using solution stack: ${SOLUTION_STACK}"
    
    # Create environment using solution stack name
    echo "🚀 Creating environment (this may take 10-15 minutes)..."
    aws elasticbeanstalk create-environment \
        --application-name "${APP_NAME}" \
        --environment-name "${ENV_NAME}" \
        --version-label "${VERSION_LABEL}" \
        --solution-stack-name "${SOLUTION_STACK}" \
        --option-settings \
            "Namespace=aws:autoscaling:launchconfiguration,OptionName=InstanceType,Value=${INSTANCE_TYPE}" \
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=NODE_ENV,Value=production" \
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=PORT,Value=8080" \
        --region "${REGION}" \
        --output json > /tmp/eb-create.json
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Environment creation initiated${NC}"
    else
        echo -e "${RED}❌ Failed to create environment. Check /tmp/eb-create.json for details.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Environment creation initiated${NC}"
    echo "⏳ This will take 10-15 minutes. You can check progress in AWS Console."
    echo "   URL: https://console.aws.amazon.com/elasticbeanstalk/home?region=${REGION}#/environments"
fi

# Get environment URL
echo ""
echo "🔍 Getting environment URL..."
sleep 5
ENV_URL=$(aws elasticbeanstalk describe-environments \
    --application-name "${APP_NAME}" \
    --environment-names "${ENV_NAME}" \
    --region "${REGION}" \
    --query 'Environments[0].CNAME' \
    --output text 2>/dev/null || echo "")

if [ -n "$ENV_URL" ] && [ "$ENV_URL" != "None" ]; then
    echo ""
    echo -e "${GREEN}✅ Deployment Information:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🌐 Backend URL: http://${ENV_URL}"
    echo "🔗 API Endpoint: http://${ENV_URL}/api"
    echo "❤️  Health Check: http://${ENV_URL}/health"
    echo ""
    echo "📝 Next Steps:"
    echo "1. Configure environment variables in AWS Console:"
    echo "   - Go to: https://console.aws.amazon.com/elasticbeanstalk/home?region=${REGION}#/environment/dashboard?applicationName=${APP_NAME}&environmentId=$(aws elasticbeanstalk describe-environments --application-name "${APP_NAME}" --environment-names "${ENV_NAME}" --region "${REGION}" --query 'Environments[0].EnvironmentId' --output text)"
    echo "   - Configuration → Software → Environment properties"
    echo "   - Add: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL, JWT_SECRET, CORS_ORIGIN"
    echo ""
    echo "2. Update Netlify environment variable:"
    echo "   VITE_API_URL = http://${ENV_URL}/api"
    echo ""
    echo "3. Run database migration (SSH into instance):"
    echo "   cd /var/app/current && npm install && npm run migrate"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo -e "${YELLOW}⚠️  Environment is still being created. Check AWS Console for URL.${NC}"
fi

echo ""
echo -e "${GREEN}✅ Deployment script completed!${NC}"

