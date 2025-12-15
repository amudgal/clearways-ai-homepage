#!/bin/bash
# Check deployment status and get backend URL

APP_NAME="clearways-ai-backend"
ENV_NAME="clearways-ai-backend-env"
REGION="us-east-1"

echo "🔍 Checking deployment status..."

ENV_STATUS=$(aws elasticbeanstalk describe-environments \
    --application-name "${APP_NAME}" \
    --environment-names "${ENV_NAME}" \
    --region "${REGION}" \
    --query 'Environments[0].Status' \
    --output text 2>/dev/null || echo "None")

ENV_URL=$(aws elasticbeanstalk describe-environments \
    --application-name "${APP_NAME}" \
    --environment-names "${ENV_NAME}" \
    --region "${REGION}" \
    --query 'Environments[0].CNAME' \
    --output text 2>/dev/null || echo "")

if [ "$ENV_STATUS" != "None" ] && [ -n "$ENV_URL" ] && [ "$ENV_URL" != "None" ]; then
    echo ""
    echo "✅ Environment Status: ${ENV_STATUS}"
    echo "🌐 Backend URL: http://${ENV_URL}"
    echo "🔗 API Endpoint: http://${ENV_URL}/api"
    echo "❤️  Health Check: http://${ENV_URL}/health"
    echo ""
    echo "📝 Next Steps:"
    echo "1. Configure environment variables in AWS Console"
    echo "2. Update Netlify: VITE_API_URL = http://${ENV_URL}/api"
    echo "3. Run database migration"
else
    echo "⏳ Environment is still being created..."
    echo "Status: ${ENV_STATUS}"
    echo "Check AWS Console: https://console.aws.amazon.com/elasticbeanstalk/home?region=${REGION}#/environments"
fi

