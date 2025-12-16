#!/bin/bash

# Script to verify domain in AWS SES via CLI
# Usage: ./verify-domain-ses.sh clearways.ai

REGION="us-east-1"
DOMAIN="${1:-clearways.ai}"

echo "Verifying domain in AWS SES..."
echo "Domain: $DOMAIN"
echo "Region: $REGION"
echo ""

# Check if domain is already verified
echo "Checking if domain is already verified..."
VERIFICATION_STATUS=$(aws sesv2 get-email-identity \
  --email-identity "$DOMAIN" \
  --region "$REGION" \
  --query 'VerificationStatus' \
  --output text 2>/dev/null)

if [ "$VERIFICATION_STATUS" == "SUCCESS" ]; then
  echo "✅ Domain $DOMAIN is already verified!"
  
  # Get DNS records
  echo ""
  echo "DNS Records (if needed for reference):"
  aws sesv2 get-email-identity \
    --email-identity "$DOMAIN" \
    --region "$REGION" \
    --query 'DkimAttributes.DnsRecords' \
    --output json 2>/dev/null
  
  exit 0
fi

# Request verification
echo "Requesting verification for domain $DOMAIN..."
RESULT=$(aws sesv2 create-email-identity \
  --email-identity "$DOMAIN" \
  --region "$REGION" 2>&1)

if [ $? -eq 0 ]; then
  echo "✅ Verification request created successfully!"
  echo ""
  echo "DNS Records to add to your DNS provider:"
  echo "----------------------------------------"
  
  # Get DKIM records
  aws sesv2 get-email-identity \
    --email-identity "$DOMAIN" \
    --region "$REGION" \
    --query 'DkimAttributes.DnsRecords[*].{Name:Name,Type:Type,Value:Value}' \
    --output table 2>/dev/null
  
  echo ""
  echo "Next steps:"
  echo "1. Add the DNS records above to your DNS provider (where $DOMAIN is hosted)"
  echo "2. Wait for DNS propagation (5-30 minutes)"
  echo "3. Check verification status with:"
  echo "   aws sesv2 get-email-identity --email-identity $DOMAIN --region $REGION"
  echo ""
  echo "After DNS records are added, SES will automatically verify the domain."
else
  # Check if identity already exists
  if echo "$RESULT" | grep -q "already exists"; then
    echo "ℹ️  Domain identity already exists. Checking status..."
    aws sesv2 get-email-identity \
      --email-identity "$DOMAIN" \
      --region "$REGION" \
      --query '{Status:VerificationStatus,Attributes:VerificationAttributes}' \
      --output json
  else
    echo "❌ Error: $RESULT"
    exit 1
  fi
fi

