#!/bin/bash

# Check HTTPS listener configuration status
ENV_NAME="clearways-ai-backend-env"
REGION="us-east-1"

echo "Checking Elastic Beanstalk environment status..."
echo ""

STATUS=$(aws elasticbeanstalk describe-environments \
  --environment-names $ENV_NAME \
  --region $REGION \
  --query 'Environments[0].Status' \
  --output text)

HEALTH=$(aws elasticbeanstalk describe-environments \
  --environment-names $ENV_NAME \
  --region $REGION \
  --query 'Environments[0].Health' \
  --output text)

echo "Environment Status: $STATUS"
echo "Environment Health: $HEALTH"
echo ""

if [ "$STATUS" == "Ready" ]; then
  echo "✅ Environment update complete!"
  echo ""
  echo "Testing HTTPS endpoint..."
  curl -v https://api.clearways.ai/health 2>&1 | head -20
  echo ""
  echo "If you see 200 OK, HTTPS is working correctly."
else
  echo "⏳ Environment is still updating. This typically takes 5-10 minutes."
  echo ""
  echo "To check again, run:"
  echo "  ./check-https-status.sh"
  echo ""
  echo "Or manually:"
  echo "  aws elasticbeanstalk describe-environments --environment-names $ENV_NAME --region $REGION --query 'Environments[0].Status'"
fi

