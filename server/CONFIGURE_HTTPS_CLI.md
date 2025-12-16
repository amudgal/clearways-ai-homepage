# Configure HTTPS on Elastic Beanstalk via AWS CLI

This guide uses AWS CLI to configure HTTPS for your backend.

## Prerequisites

1. AWS CLI installed and configured: `aws configure`
2. Appropriate IAM permissions for ACM and Elastic Beanstalk

## Step 1: Request SSL Certificate via CLI

### Option A: Request Certificate for Elastic Beanstalk Domain

```bash
# Request certificate for the Elastic Beanstalk domain
aws acm request-certificate \
  --domain-name clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com \
  --validation-method DNS \
  --region us-east-1
```

This will return a Certificate ARN like:
```
arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012
```

**Save this ARN** - you'll need it in Step 3.

### Option B: Request Wildcard Certificate (Recommended)

If you want to use the certificate for multiple subdomains:

```bash
aws acm request-certificate \
  --domain-name "*.eba-skxjjmed.us-east-1.elasticbeanstalk.com" \
  --validation-method DNS \
  --region us-east-1
```

## Step 2: Get Certificate Details for DNS Validation

After requesting, you need to validate the certificate:

```bash
# Get certificate ARN (replace with your certificate ARN from Step 1)
CERT_ARN="arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"

# Get DNS validation records
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --output json
```

This will return something like:
```json
{
  "Name": "_abc123.eba-skxjjmed.us-east-1.elasticbeanstalk.com",
  "Type": "CNAME",
  "Value": "_xyz789.acm-validations.aws."
}
```

### Add DNS Record

You need to add this CNAME record to validate the certificate. The exact method depends on where your domain is hosted:

1. **If using Route 53:**
   ```bash
   # Get hosted zone ID for your domain
   aws route53 list-hosted-zones --query "HostedZones[?Name=='eba-skxjjmed.us-east-1.elasticbeanstalk.com.']" --output json
   
   # Add validation record (replace ZONE_ID and use values from above)
   aws route53 change-resource-record-sets \
     --hosted-zone-id ZONE_ID \
     --change-batch '{
       "Changes": [{
         "Action": "CREATE",
         "ResourceRecordSet": {
           "Name": "_abc123.eba-skxjjmed.us-east-1.elasticbeanstalk.com",
           "Type": "CNAME",
           "TTL": 300,
           "ResourceRecords": [{"Value": "_xyz789.acm-validations.aws."}]
         }
       }]
     }'
   ```

2. **If using external DNS provider:**
   - Manually add the CNAME record from Step 2 output
   - Wait for DNS propagation (5-30 minutes)

## Step 3: Wait for Certificate Validation

Check certificate status:

```bash
# Check certificate status
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text
```

Wait until status is **ISSUED** (this can take 5-30 minutes after DNS validation).

## Step 4: Configure HTTPS Listener on Elastic Beanstalk

### Option A: Using EB CLI (Easiest)

```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server

# Create .ebextensions/01-https.config file
mkdir -p .ebextensions
cat > .ebextensions/01-https.config <<EOF
option_settings:
  aws:elbv2:listener:443:
    Protocol: HTTPS
    SSLCertificateArns: $CERT_ARN
EOF

# Deploy the configuration
eb deploy
```

### Option B: Using AWS CLI Directly

```bash
# Get your environment ID
ENV_NAME="clearways-ai-backend-env"
APP_NAME="clearways-ai-backend"

# Get environment ID
ENV_ID=$(aws elasticbeanstalk describe-environments \
  --application-name $APP_NAME \
  --environment-names $ENV_NAME \
  --query 'Environments[0].EnvironmentId' \
  --output text)

# Get current configuration template
aws elasticbeanstalk describe-configuration-settings \
  --application-name $APP_NAME \
  --environment-name $ENV_NAME \
  --output json > current-config.json

# Update load balancer configuration
# Note: This is complex - it's easier to use the console or EB CLI
# But here's the approach:

# 1. Create a configuration template with HTTPS
# 2. Apply it to the environment

# Alternatively, use the console or EB CLI (Option A above)
```

### Option C: Using AWS Console (Recommended for Load Balancer Config)

Since load balancer configuration via CLI is complex, use the console:

1. Go to **Elastic Beanstalk** → Your Environment
2. **Configuration** → **Load balancer** → **Modify**
3. Add listener:
   - Port: 443
   - Protocol: HTTPS
   - SSL certificate: Select your certificate (use the ARN from Step 1)
4. Click **Apply**

## Step 5: Verify HTTPS Works

```bash
# Test HTTPS endpoint
curl -v https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/health

# Should return 200 OK
```

## Step 6: Update Environment Variables (If Needed)

After HTTPS is working, ensure CORS_ORIGIN is set:

```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server

eb setenv CORS_ORIGIN="https://www.clearways.ai,https://clearways.ai,https://clearways-ai-homepage.netlify.app"
```

## Complete Script

Here's a complete script to automate Steps 1-3:

```bash
#!/bin/bash

# Configuration
DOMAIN="clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com"
REGION="us-east-1"

echo "Step 1: Requesting certificate..."
CERT_ARN=$(aws acm request-certificate \
  --domain-name $DOMAIN \
  --validation-method DNS \
  --region $REGION \
  --query 'CertificateArn' \
  --output text)

echo "Certificate ARN: $CERT_ARN"
echo ""
echo "Step 2: Get DNS validation record..."
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region $REGION \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --output json

echo ""
echo "Step 3: Add the DNS record above to validate the certificate"
echo "Then wait for validation and run:"
echo "  aws acm describe-certificate --certificate-arn $CERT_ARN --region $REGION --query 'Certificate.Status'"
echo ""
echo "Once status is 'ISSUED', configure the HTTPS listener in Elastic Beanstalk console"
```

Save this as `request-cert.sh`, make it executable, and run it:

```bash
chmod +x request-cert.sh
./request-cert.sh
```

## Troubleshooting

### Certificate Status Stays "PENDING_VALIDATION"
- Check DNS record was added correctly
- Wait longer for DNS propagation
- Verify DNS record with: `dig CNAME _abc123.eba-skxjjmed.us-east-1.elasticbeanstalk.com`

### Can't Find Certificate in Elastic Beanstalk Console
- Make sure certificate is in the **same region** as Elastic Beanstalk
- Check certificate status is **ISSUED**

### HTTPS Still Times Out After Configuration
- Wait for environment update to complete (5-10 minutes)
- Check load balancer configuration shows HTTPS listener
- Verify security groups allow port 443

## Quick Reference

```bash
# Request certificate
aws acm request-certificate --domain-name DOMAIN --validation-method DNS --region us-east-1

# Check certificate status
aws acm describe-certificate --certificate-arn ARN --region us-east-1 --query 'Certificate.Status'

# List certificates
aws acm list-certificates --region us-east-1

# Get certificate details
aws acm describe-certificate --certificate-arn ARN --region us-east-1
```

