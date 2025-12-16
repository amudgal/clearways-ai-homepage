#!/bin/bash

CERT_ARN="arn:aws:acm:us-east-1:194893387380:certificate/aa0de9b8-d11b-4191-a65c-1eabd15c53c3"
REGION="us-east-1"

echo "Checking certificate status..."
STATUS=$(aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region $REGION \
  --query 'Certificate.Status' \
  --output text 2>/dev/null)

echo "Status: $STATUS"

if [ "$STATUS" = "ISSUED" ]; then
  echo "✅ Certificate is issued and ready to use!"
  echo ""
  echo "Next steps:"
  echo "1. Configure HTTPS listener in Elastic Beanstalk console"
  echo "2. Point api.clearways.ai to Elastic Beanstalk (add CNAME record)"
  echo "3. Update Netlify VITE_API_URL to https://api.clearways.ai/api"
else
  echo "⏳ Certificate is still being validated..."
  echo ""
  echo "Make sure you've added the DNS validation record:"
  aws acm describe-certificate \
    --certificate-arn "$CERT_ARN" \
    --region $REGION \
    --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
    --output json 2>/dev/null | python3 -m json.tool || \
  aws acm describe-certificate \
    --certificate-arn "$CERT_ARN" \
    --region $REGION \
    --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
    --output json 2>/dev/null
fi
