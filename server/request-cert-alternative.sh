#!/bin/bash

# Alternative: Request certificate for a custom domain
# This is the recommended approach since Elastic Beanstalk domains are too long

REGION="us-east-1"

echo "=========================================="
echo "Request SSL Certificate for Custom Domain"
echo "=========================================="
echo ""
echo "Elastic Beanstalk domain names exceed ACM's 64-character limit."
echo "You need to use a custom domain (e.g., api.clearways.ai)"
echo ""

read -p "Enter your custom domain (e.g., api.clearways.ai): " DOMAIN

if [ -z "$DOMAIN" ]; then
  echo "Error: Domain cannot be empty"
  exit 1
fi

echo ""
echo "Requesting certificate for: $DOMAIN"
echo "Region: $REGION"
echo ""

CERT_ARN=$(aws acm request-certificate \
  --domain-name "$DOMAIN" \
  --validation-method DNS \
  --region $REGION \
  --query 'CertificateArn' \
  --output text 2>&1)

if [[ $CERT_ARN == arn:aws:acm:* ]]; then
  echo "✅ Certificate requested successfully!"
  echo ""
  echo "Certificate ARN: $CERT_ARN"
  echo ""
  echo "Step 2: DNS Validation Record (add this to your DNS):"
  echo "----------------------------------------"
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
  
  echo ""
  echo "Step 3: Next steps:"
  echo "1. Add the DNS record above to validate the certificate"
  echo "2. Check status: aws acm describe-certificate --certificate-arn $CERT_ARN --region $REGION --query 'Certificate.Status'"
  echo "3. Once 'ISSUED', configure HTTPS listener in Elastic Beanstalk"
  echo "4. Point your custom domain to Elastic Beanstalk (add CNAME record)"
  echo ""
  echo "Save this Certificate ARN: $CERT_ARN"
else
  echo "❌ Error requesting certificate:"
  echo "$CERT_ARN"
  exit 1
fi
