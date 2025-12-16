# HTTPS Configuration Solution

## Problem

Elastic Beanstalk domain names are **too long** for AWS Certificate Manager (ACM limit: 64 characters).

Your domain: `clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com` (67 characters)

## Solution Options

### Option 1: Use Custom Domain (RECOMMENDED)

Use a shorter custom domain like `api.clearways.ai` or `backend.clearways.ai`.

#### Step 1: Request Certificate for Custom Domain

```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server
./request-cert-alternative.sh
```

Or manually:
```bash
aws acm request-certificate \
  --domain-name api.clearways.ai \
  --validation-method DNS \
  --region us-east-1
```

#### Step 2: Validate Certificate

Add the DNS validation record to your DNS provider (where `clearways.ai` is hosted).

#### Step 3: Point Custom Domain to Elastic Beanstalk

1. Get your Elastic Beanstalk CNAME:
   ```bash
   aws elasticbeanstalk describe-environments \
     --environment-names clearways-ai-backend-env \
     --query 'Environments[0].CNAME' \
     --output text
   ```

2. Add CNAME record in your DNS:
   - **Name**: `api` (or `backend`)
   - **Type**: CNAME
   - **Value**: `clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com`

#### Step 4: Configure HTTPS Listener

1. Go to **Elastic Beanstalk** → **Configuration** → **Load balancer**
2. Add HTTPS listener (port 443)
3. Select your certificate (for `api.clearways.ai`)
4. Apply

#### Step 5: Update Netlify

Update `VITE_API_URL` to:
```
https://api.clearways.ai/api
```

### Option 2: Use AWS Console (EASIEST)

The console can help you set this up more easily:

1. **Go to Elastic Beanstalk Console**
   - https://console.aws.amazon.com/elasticbeanstalk/
   - Select your environment

2. **Configuration** → **Load balancer** → **Modify**

3. **Add HTTPS listener**:
   - Port: 443
   - Protocol: HTTPS
   - Click **"Request a new certificate"** or **"Select an existing certificate"**

4. If requesting new:
   - Enter a custom domain (e.g., `api.clearways.ai`)
   - AWS will guide you through validation

5. **Apply** and wait for update

### Option 3: Use IP-Based Certificate (Advanced)

If you can't use a custom domain, you can:
1. Get the load balancer IP
2. Request certificate for the IP (requires email validation)
3. Configure HTTPS

But this is more complex and not recommended.

## Quick Start: Custom Domain

If you have `clearways.ai` domain:

1. **Request certificate:**
   ```bash
   ./request-cert-alternative.sh
   # Enter: api.clearways.ai
   ```

2. **Add DNS records:**
   - CNAME for `api.clearways.ai` → Elastic Beanstalk CNAME
   - CNAME for certificate validation (from script output)

3. **Wait for certificate validation** (5-30 minutes)

4. **Configure HTTPS in Elastic Beanstalk console**

5. **Update Netlify** `VITE_API_URL` to `https://api.clearways.ai/api`

## Testing

After configuration:

```bash
# Test custom domain
curl https://api.clearways.ai/health

# Or test Elastic Beanstalk directly (if HTTPS configured)
curl https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/health
```

## Why Custom Domain is Better

1. ✅ Shorter, easier to remember
2. ✅ Works with ACM certificates
3. ✅ Can use your own branding
4. ✅ Easier to migrate if needed
5. ✅ Better for production

