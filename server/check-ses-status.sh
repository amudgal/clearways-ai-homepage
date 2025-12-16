#!/bin/bash

# Script to check SES verification status
# Usage: ./check-ses-status.sh noreply@clearways.ai
# Or: ./check-ses-status.sh clearways.ai

REGION="us-east-1"
IDENTITY="${1:-noreply@clearways.ai}"

echo "Checking SES verification status..."
echo "Identity: $IDENTITY"
echo "Region: $REGION"
echo ""

aws sesv2 get-email-identity \
  --email-identity "$IDENTITY" \
  --region "$REGION" \
  --query '{
    IdentityName:IdentityName,
    VerificationStatus:VerificationStatus,
    VerificationAttributes:VerificationAttributes,
    DkimAttributes:DkimAttributes.DnsRecords
  }' \
  --output json 2>/dev/null

if [ $? -ne 0 ]; then
  echo "❌ Identity not found: $IDENTITY"
  echo ""
  echo "To create it, run:"
  if [[ "$IDENTITY" == *"@"* ]]; then
    echo "  ./verify-email-ses.sh $IDENTITY"
  else
    echo "  ./verify-domain-ses.sh $IDENTITY"
  fi
fi

