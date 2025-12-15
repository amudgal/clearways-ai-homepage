#!/bin/bash
# Quick deployment script for AWS Elastic Beanstalk

set -e

echo "🚀 ClearWays AI Backend - AWS Deployment Script"
echo "================================================"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   https://aws.amazon.com/cli/"
    exit 1
fi

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    echo "📦 Installing EB CLI..."
    pip install awsebcli --upgrade
fi

# Check if already initialized
if [ ! -f ".elasticbeanstalk/config.yml" ]; then
    echo "🔧 Initializing Elastic Beanstalk..."
    eb init -p node.js -r us-east-1 clearways-ai-backend --platform "Node.js 18 running on 64bit Amazon Linux 2"
else
    echo "✅ Elastic Beanstalk already initialized"
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Check if environment exists
if eb list | grep -q "clearways-ai-backend-env"; then
    echo "📤 Deploying to existing environment..."
    eb deploy
else
    echo "🆕 Creating new environment..."
    eb create clearways-ai-backend-env \
        --instance-type t3.small \
        --platform "Node.js 18 running on 64bit Amazon Linux 2"
fi

# Set environment variables
echo "⚙️  Setting environment variables..."
read -p "Enter your Netlify site URL (e.g., https://your-site.netlify.app): " NETLIFY_URL
read -sp "Enter a strong JWT secret (will be hidden): " JWT_SECRET
echo ""

eb setenv \
  DB_HOST=cleartrails-dev-db.cqzmmee6i8lc.us-east-1.rds.amazonaws.com \
  DB_PORT=5432 \
  DB_NAME=cleartrails_dev \
  DB_USER=cleartrails_admin \
  DB_PASSWORD=DCs1QiM5bBCZ6WJENpR4YBjFi \
  DB_SSL=true \
  JWT_SECRET="$JWT_SECRET" \
  CORS_ORIGIN="$NETLIFY_URL" \
  NODE_ENV=production \
  PORT=8080

# Get the backend URL
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Backend Information:"
eb status | grep "CNAME"
BACKEND_URL=$(eb status | grep "CNAME" | awk '{print $2}')
echo ""
echo "🔗 Your backend API URL: http://${BACKEND_URL}/api"
echo ""
echo "📝 Next steps:"
echo "1. Add this to Netlify environment variables:"
echo "   VITE_API_URL = http://${BACKEND_URL}/api"
echo "2. Test the health endpoint:"
echo "   curl http://${BACKEND_URL}/health"
echo "3. Run database migration:"
echo "   eb ssh"
echo "   cd /var/app/current && npm run migrate"

