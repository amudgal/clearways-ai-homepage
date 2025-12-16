#!/bin/bash

# Configuration
DOMAIN="clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com"
REGION="us-east-1"

echo "Step 1: Requesting certificate for $DOMAIN..."
CERT_ARN=$(aws acm request-certificate \
  --domain-name $DOMAIN \
  --validation-method DNS \
  --region $REGION \
  --query 'CertificateArn' \
  --output text 2>/dev/null)

if [ -z "$CERT_ARN" ]; then
  echo "Error: Failed to request certificate. Check AWS CLI configuration."
  exit 1
fi

echo "✅ Certificate ARN: $CERT_ARN"
echo ""
echo "Step 2: DNS Validation Record (add this to your DNS):"
echo "----------------------------------------"
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region $REGION \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --output json 2>/dev/null | python3 -m json.tool

echo ""
echo "Step 3: Next steps:"
echo "1. Add the DNS record above to validate the certificate"
echo "2. Wait for validation (check status with):"
echo "   aws acm describe-certificate --certificate-arn $CERT_ARN --region $REGION --query 'Certificate.Status'"
echo "3. Once status is 'ISSUED', configure HTTPS listener in Elastic Beanstalk console"
echo ""
echo "Certificate ARN (save this): $CERT_ARN"
