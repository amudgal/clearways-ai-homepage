# HTTPS Configuration for Classic Load Balancer

## Issue Identified

Your Elastic Beanstalk environment is using a **Classic Load Balancer** (not Application Load Balancer). Classic Load Balancers have different requirements for HTTPS:

- **Classic Load Balancers** require **IAM certificates** (not ACM certificates)
- **Application Load Balancers** support **ACM certificates** directly

## Current Status

I've attempted to configure HTTPS for the Classic Load Balancer using the ACM certificate ARN. However, this may not work because Classic Load Balancers typically don't accept ACM certificates directly.

## Solutions

### Option 1: Import ACM Certificate to IAM (Recommended)

If the current configuration fails, import your ACM certificate to IAM:

```bash
# Get certificate details from ACM
CERT_ARN="arn:aws:acm:us-east-1:194893387380:certificate/aa0de9b8-d11b-4191-a65c-1eabd15c53c3"

# Download certificate (you'll need to do this via AWS Console or get the certificate body/chain/private key)
# Then upload to IAM:
aws iam upload-server-certificate \
  --server-certificate-name api-clearways-ai-cert \
  --certificate-body file://certificate.pem \
  --certificate-chain file://chain.pem \
  --private-key file://private-key.pem \
  --region us-east-1
```

**Note**: You'll need the certificate body, chain, and private key. These are only available when you first request the certificate. If you don't have them, you'll need to request a new certificate or use Option 2.

### Option 2: Configure via AWS Console

The AWS Console might handle the certificate conversion automatically:

1. Go to **AWS Console** → **Elastic Beanstalk** → `clearways-ai-backend-env`
2. Click **Configuration** → **Load balancer**
3. Click **Modify**
4. Under **Port configuration**:
   - **Port 80**: Keep as HTTP
   - **Port 443**: 
     - Click **Add listener** or modify existing
     - **Port**: `443`
     - **Protocol**: `HTTPS`
     - **SSL certificate**: The console might allow you to select the ACM certificate, or it might prompt you to import it
5. Click **Apply**
6. Wait 5-10 minutes for update to complete

### Option 3: Upgrade to Application Load Balancer (Best Long-term Solution)

Application Load Balancers support ACM certificates natively and are the recommended approach:

1. Go to **AWS Console** → **Elastic Beanstalk** → `clearways-ai-backend-env`
2. Click **Configuration** → **Load balancer**
3. Click **Modify**
4. Change **Load balancer type** from **Classic** to **Application**
5. Click **Apply** (this will recreate the load balancer - may cause brief downtime)
6. After upgrade, add HTTPS listener:
   - Port: `443`
   - Protocol: `HTTPS`
   - SSL certificate: Select `api.clearways.ai` (ACM certificate)
7. Click **Apply**

**Note**: Upgrading to ALB will change your load balancer DNS name, but your CNAME (`api.clearways.ai`) will still work.

## Check Current Configuration

After the current update completes, check if HTTPS is working:

```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server
./verify-https-config.sh
```

Or test directly:
```bash
curl -v https://api.clearways.ai/health
```

## Verify Load Balancer Type

Check what type of load balancer you have:

```bash
# Check for Classic Load Balancer
aws elb describe-load-balancers --region us-east-1 \
  --query "LoadBalancerDescriptions[?contains(LoadBalancerName, 'AWSEBLoa-EQI5PKOHAT0J')]" \
  --output json

# Check for Application Load Balancer
aws elbv2 describe-load-balancers --region us-east-1 \
  --query "LoadBalancers[?contains(LoadBalancerName, 'AWSEBLoa-EQI5PKOHAT0J')]" \
  --output json
```

## Next Steps

1. **Wait for current update to complete** (5-10 minutes)
2. **Test HTTPS**: `curl -v https://api.clearways.ai/health`
3. **If it fails**: Use Option 2 (AWS Console) or Option 3 (Upgrade to ALB)
4. **If it works**: Proceed with updating Netlify and CORS configuration

