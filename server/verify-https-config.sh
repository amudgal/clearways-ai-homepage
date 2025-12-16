#!/bin/bash

# Verify HTTPS listener configuration
ENV_NAME="clearways-ai-backend-env"
REGION="us-east-1"

echo "Checking HTTPS listener configuration..."
echo ""

# Check environment status
STATUS=$(aws elasticbeanstalk describe-environments \
  --environment-names $ENV_NAME \
  --region $REGION \
  --query 'Environments[0].Status' \
  --output text)

echo "Environment Status: $STATUS"
echo ""

if [ "$STATUS" != "Ready" ]; then
  echo "⏳ Environment is still updating. Please wait..."
  exit 0
fi

# Check for HTTPS listener configuration
echo "Checking for HTTPS listener configuration..."
HTTPS_CONFIG=$(aws elasticbeanstalk describe-configuration-settings \
  --application-name clearways-ai-backend \
  --environment-name $ENV_NAME \
  --region $REGION \
  --query 'ConfigurationSettings[0].OptionSettings[?Namespace==`aws:elbv2:listener:443`]' \
  --output json)

if [ "$HTTPS_CONFIG" == "[]" ] || [ -z "$HTTPS_CONFIG" ]; then
  echo "❌ HTTPS listener configuration not found!"
  echo ""
  echo "The configuration may not have been applied correctly."
  echo "Please try configuring via AWS Console:"
  echo "  1. Go to Elastic Beanstalk → $ENV_NAME"
  echo "  2. Configuration → Load balancer → Modify"
  echo "  3. Add listener: Port 443, Protocol HTTPS"
  echo "  4. Select certificate: api.clearways.ai"
else
  echo "✅ HTTPS listener configuration found:"
  echo "$HTTPS_CONFIG" | python3 -m json.tool
fi

echo ""
echo "Testing HTTPS endpoint..."
echo ""

# Test HTTPS
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://api.clearways.ai/health 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ] && [ "$RESPONSE" == "200" ]; then
  echo "✅ HTTPS is working! (HTTP $RESPONSE)"
  curl -s https://api.clearways.ai/health | python3 -m json.tool 2>/dev/null || curl -s https://api.clearways.ai/health
elif [ $EXIT_CODE -eq 28 ] || [ $EXIT_CODE -eq 7 ]; then
  echo "❌ Connection timeout or failed"
  echo "This might mean:"
  echo "  - HTTPS listener is not configured yet"
  echo "  - DNS hasn't propagated"
  echo "  - Security group doesn't allow port 443"
  echo ""
  echo "Try again in a few minutes, or configure via AWS Console."
else
  echo "⚠️  HTTPS test returned: HTTP $RESPONSE (exit code: $EXIT_CODE)"
fi

