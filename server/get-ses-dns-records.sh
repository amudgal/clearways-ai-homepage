#!/bin/bash

# Script to get all DNS records needed for SES domain verification
# Usage: ./get-ses-dns-records.sh clearways.ai

REGION="us-east-1"
DOMAIN="${1:-clearways.ai}"

echo "Getting DNS records for SES domain verification..."
echo "Domain: $DOMAIN"
echo "Region: $REGION"
echo ""
echo "=" | head -c 60 && echo ""

# Get identity data
IDENTITY_DATA=$(aws sesv2 get-email-identity \
  --email-identity "$DOMAIN" \
  --region "$REGION" \
  --output json 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "❌ Error: Could not get identity data for $DOMAIN"
  exit 1
fi

# Extract verification status
STATUS=$(echo "$IDENTITY_DATA" | python3 -c "import sys, json; print(json.load(sys.stdin).get('VerificationStatus', 'N/A'))" 2>/dev/null)

echo "Verification Status: $STATUS"
echo ""

if [ "$STATUS" == "SUCCESS" ]; then
  echo "✅ Domain is already verified!"
  exit 0
fi

# Get DKIM tokens
echo "DKIM Records (REQUIRED for domain verification):"
echo "-" | head -c 60 && echo ""
echo ""

TOKENS=$(echo "$IDENTITY_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
dkim = data.get('DkimAttributes', {})
tokens = dkim.get('Tokens', [])
for i, token in enumerate(tokens, 1):
    print(f'{i}. Name:  {token}._domainkey.$DOMAIN')
    print(f'   Type:  CNAME')
    print(f'   Value: {token}.dkim.amazonses.com')
    print()
" 2>/dev/null)

if [ -z "$TOKENS" ]; then
  echo "⚠️  No DKIM tokens found. The domain may need to be re-created in SES."
  echo ""
  echo "Try:"
  echo "  1. Check AWS SES Console for verification records"
  echo "  2. Or delete and recreate the domain identity:"
  echo "     aws sesv2 delete-email-identity --email-identity $DOMAIN --region $REGION"
  echo "     ./verify-domain-ses.sh $DOMAIN"
else
  echo "$TOKENS"
fi

echo ""
echo "After adding DNS records:"
echo "1. Wait 5-30 minutes for DNS propagation"
echo "2. Check status: ./check-ses-status.sh $DOMAIN"
echo "3. SES will automatically verify once DNS records are found"

