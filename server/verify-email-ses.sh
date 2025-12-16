#!/bin/bash

# Script to verify email address in AWS SES via CLI
# Usage: ./verify-email-ses.sh noreply@clearways.ai

REGION="us-east-1"
EMAIL_ADDRESS="${1:-noreply@clearways.ai}"

echo "Verifying email address in AWS SES..."
echo "Email: $EMAIL_ADDRESS"
echo "Region: $REGION"
echo ""

# Check if email is already verified
echo "Checking if email is already verified..."
VERIFICATION_STATUS=$(aws sesv2 get-email-identity \
  --email-identity "$EMAIL_ADDRESS" \
  --region "$REGION" \
  --query 'VerificationStatus' \
  --output text 2>/dev/null)

if [ "$VERIFICATION_STATUS" == "SUCCESS" ]; then
  echo "✅ Email $EMAIL_ADDRESS is already verified!"
  exit 0
elif [ "$VERIFICATION_STATUS" == "PENDING" ]; then
  echo "⏳ Email $EMAIL_ADDRESS is pending verification."
  echo "Check your email inbox for the verification link."
  exit 0
fi

# Request verification
echo "Requesting verification for $EMAIL_ADDRESS..."
RESULT=$(aws sesv2 create-email-identity \
  --email-identity "$EMAIL_ADDRESS" \
  --region "$REGION" 2>&1)

if [ $? -eq 0 ]; then
  echo "✅ Verification request sent successfully!"
  echo ""
  echo "Next steps:"
  echo "1. Check the inbox for $EMAIL_ADDRESS"
  echo "2. Look for an email from AWS SES"
  echo "3. Click the verification link in the email"
  echo ""
  echo "Or check verification status with:"
  echo "  aws sesv2 get-email-identity --email-identity $EMAIL_ADDRESS --region $REGION"
else
  # Check if identity already exists
  if echo "$RESULT" | grep -q "already exists"; then
    echo "ℹ️  Email identity already exists. Checking status..."
    aws sesv2 get-email-identity \
      --email-identity "$EMAIL_ADDRESS" \
      --region "$REGION" \
      --query '{Status:VerificationStatus,Attributes:VerificationAttributes}' \
      --output json
  else
    echo "❌ Error: $RESULT"
    exit 1
  fi
fi

