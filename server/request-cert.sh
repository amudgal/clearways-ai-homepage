#!/bin/bash

# Configuration
# Note: Elastic Beanstalk domain names are too long for ACM (64 char limit)
# Options: Use wildcard, custom domain, or request for IP/load balancer
REGION="us-east-1"

echo "Elastic Beanstalk domain names are too long for ACM certificates."
echo "You have two options:"
echo ""
echo "Option 1: Use a custom domain (RECOMMENDED)"
echo "  - Point a custom domain (e.g., api.clearways.ai) to your Elastic Beanstalk"
echo "  - Request certificate for the custom domain"
echo ""
echo "Option 2: Request certificate via Console (EASIEST)"
echo "  - Go to: https://console.aws.amazon.com/acm/"
echo "  - Request certificate for a custom domain or use IP-based validation"
echo ""
read -p "Do you have a custom domain? (y/n): " HAS_DOMAIN

if [ "$HAS_DOMAIN" = "y" ] || [ "$HAS_DOMAIN" = "Y" ]; then
  read -p "Enter your custom domain (e.g., api.clearways.ai): " DOMAIN
  echo "Step 1: Requesting certificate for $DOMAIN..."
  CERT_ARN=$(aws acm request-certificate \
    --domain-name $DOMAIN \
    --validation-method DNS \
    --region $REGION \
    --query 'CertificateArn' \
    --output text 2>&1)
  
  if [[ $CERT_ARN == arn:aws:acm:* ]]; then
    echo "✅ Certificate ARN: $CERT_ARN"
  else
    echo "❌ Error: $CERT_ARN"
    exit 1
  fi
else
  echo ""
  echo "Since Elastic Beanstalk domain is too long, please:"
  echo "1. Go to AWS Console → Certificate Manager"
  echo "2. Request certificate for a custom domain (e.g., api.clearways.ai)"
  echo "3. Or configure a custom domain for your Elastic Beanstalk environment"
  echo ""
  echo "Alternative: Configure HTTPS via Elastic Beanstalk Console:"
  echo "  - Go to Elastic Beanstalk → Configuration → Load balancer"
  echo "  - Add HTTPS listener"
  echo "  - AWS will help you create/select a certificate"
  exit 0
fi

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
