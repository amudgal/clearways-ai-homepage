# Elastic Beanstalk Custom Domain Setup Guide

This guide walks you through setting up a custom domain (`api.clearways.ai`) for your Elastic Beanstalk backend.

## Prerequisites

- Domain registered and DNS managed (e.g., Route 53, GoDaddy, Namecheap)
- Elastic Beanstalk environment running and healthy
- Access to AWS Console

---

## Step 1: Add CNAME Record in DNS

### Option A: Using Route 53 (AWS DNS)

1. **Go to Route 53 Console**
   - Navigate to: https://console.aws.amazon.com/route53/
   - Click **Hosted zones**
   - Select your domain: `clearways.ai`

2. **Create CNAME Record**
   - Click **Create record**
   - **Record name**: `api` (this creates `api.clearways.ai`)
   - **Record type**: `CNAME - Routes traffic to another domain name and some AWS resources`
   - **Value**: `clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com`
   - **TTL**: `300` (or leave default)
   - Click **Create records**

### Option B: Using Other DNS Providers (GoDaddy, Namecheap, etc.)

1. **Log in to Your DNS Provider**
   - Go to your domain registrar's DNS management page

2. **Add CNAME Record**
   - Find **DNS Management** or **DNS Settings**
   - Click **Add Record** or **Add DNS Record**
   - **Type**: `CNAME`
   - **Name/Host**: `api` (or `api.clearways.ai` depending on provider)
   - **Value/Target**: `clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com`
   - **TTL**: `300` (or leave default)
   - Click **Save** or **Add Record**

3. **Wait for DNS Propagation**
   - DNS changes can take 5 minutes to 48 hours
   - Usually completes within 1-2 hours
   - You can check propagation status using: https://www.whatsmydns.net/#CNAME/api.clearways.ai

---

## Step 2: Verify DNS Record

Before proceeding, verify the CNAME record is working:

```bash
# Check DNS resolution
dig api.clearways.ai CNAME
# or
nslookup api.clearways.ai
```

You should see:
```
api.clearways.ai canonical name = clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com
```

---

## Step 3: Configure Custom Domain in Elastic Beanstalk

### Method A: Using Elastic Beanstalk Console (Recommended)

1. **Go to Elastic Beanstalk Console**
   - Navigate to: https://console.aws.amazon.com/elasticbeanstalk/home?region=us-east-1
   - Click on your environment: `clearways-ai-backend-env`

2. **Open Configuration**
   - Click **Configuration** in the left sidebar
   - Scroll down to **Network** section
   - Click **Edit**

3. **Configure Load Balancer**
   - **Load balancer type**: Choose **Application Load Balancer** (if not already selected)
   - **Listeners**: 
     - Port `80` → Forward to `8080` (HTTP)
     - Port `443` → Forward to `8080` (HTTPS) - **Add this for SSL**

4. **Add Custom Domain**
   - Scroll to **Custom domains** section
   - Click **Add custom domain**
   - **Domain name**: `api.clearways.ai`
   - Click **Add**

5. **Save Configuration**
   - Click **Apply** at the bottom
   - **Note**: This will update your environment (takes 2-5 minutes)

### Method B: Using AWS Certificate Manager (ACM) for SSL

For production, you'll want HTTPS. Here's how to set it up:

1. **Request SSL Certificate**
   - Go to: https://console.aws.amazon.com/acm/home?region=us-east-1
   - Click **Request certificate**
   - Choose **Request a public certificate**
   - **Domain names**: 
     - `api.clearways.ai`
     - `*.clearways.ai` (optional, for wildcard)
   - **Validation method**: DNS validation (recommended)
   - Click **Request**

2. **Validate Certificate**
   - AWS will provide DNS validation records (CNAME records)
   - Add these to your DNS provider (same as Step 1)
   - Wait for validation (usually 5-30 minutes)
   - Status will change to **Issued** when validated

3. **Attach Certificate to Load Balancer**
   - Go back to Elastic Beanstalk Console
   - **Configuration** → **Load balancer** → **Edit**
   - Under **HTTPS listener (port 443)**:
     - **SSL certificate**: Select your certificate from ACM
   - Click **Apply**

---

## Step 4: Update Environment Variables

After setting up the custom domain, update your environment variables:

1. **Go to Elastic Beanstalk Console**
   - **Configuration** → **Software** → **Edit**

2. **Update CORS_ORIGIN**
   - Find `CORS_ORIGIN` environment variable
   - Update to include your custom domain:
     ```
     CORS_ORIGIN = https://clearways.ai,https://www.clearways.ai,https://api.clearways.ai
     ```
   - Click **Apply**

3. **Update Frontend (Netlify)**
   - Go to Netlify Dashboard → Your Site → **Environment variables**
   - Update `VITE_API_URL` to:
     ```
     https://api.clearways.ai/api
     ```
   - Trigger a new deployment

---

## Step 5: Test the Custom Domain

1. **Test HTTP (if not using SSL yet)**
   ```bash
   curl http://api.clearways.ai/health
   ```

2. **Test HTTPS (after SSL setup)**
   ```bash
   curl https://api.clearways.ai/health
   ```

3. **Test API Endpoint**
   ```bash
   curl https://api.clearways.ai/api/health
   ```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-12-15T..."
}
```

---

## Step 6: Redirect HTTP to HTTPS (Optional but Recommended)

To force HTTPS, configure a redirect in Elastic Beanstalk:

1. **Go to Elastic Beanstalk Console**
   - **Configuration** → **Load balancer** → **Edit**

2. **Add HTTP to HTTPS Redirect**
   - Under **HTTP listener (port 80)**:
     - **Action**: Redirect HTTP to HTTPS
   - Click **Apply**

---

## Troubleshooting

### Issue: DNS not resolving

**Symptoms**: `api.clearways.ai` doesn't resolve

**Solutions**:
1. Wait longer for DNS propagation (can take up to 48 hours)
2. Verify CNAME record is correct in DNS provider
3. Check DNS propagation: https://www.whatsmydns.net/#CNAME/api.clearways.ai
4. Clear DNS cache: `sudo dscacheutil -flushcache` (macOS) or `ipconfig /flushdns` (Windows)

### Issue: 502 Bad Gateway

**Symptoms**: Domain resolves but returns 502 error

**Solutions**:
1. Check Elastic Beanstalk environment health (should be "Healthy")
2. Verify load balancer is configured correctly
3. Check application logs in Elastic Beanstalk Console
4. Ensure your application is listening on port 8080

### Issue: SSL Certificate not working

**Symptoms**: HTTPS connection fails or shows "Not Secure"

**Solutions**:
1. Verify certificate is issued and validated in ACM
2. Ensure certificate is attached to the load balancer listener (port 443)
3. Check certificate domain matches exactly (including subdomain)
4. Wait a few minutes after attaching certificate for changes to propagate

### Issue: CORS errors with custom domain

**Symptoms**: Frontend can't connect to API

**Solutions**:
1. Update `CORS_ORIGIN` in Elastic Beanstalk to include `https://api.clearways.ai`
2. Update `VITE_API_URL` in Netlify to use `https://api.clearways.ai/api`
3. Redeploy frontend after updating environment variable

---

## Quick Reference: DNS Records

### CNAME Record for API Subdomain

```
Type: CNAME
Name: api
Value: clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com
TTL: 300
```

### After Setup, Your URLs Will Be:

- **API Base**: `https://api.clearways.ai`
- **API Endpoint**: `https://api.clearways.ai/api`
- **Health Check**: `https://api.clearways.ai/health`

---

## Security Best Practices

1. **Always Use HTTPS in Production**
   - Set up SSL certificate via ACM
   - Redirect HTTP to HTTPS

2. **Update CORS Settings**
   - Only allow your frontend domains
   - Don't use wildcard `*` in production

3. **Monitor Load Balancer**
   - Set up CloudWatch alarms for 5xx errors
   - Monitor request latency

4. **Keep Environment Updated**
   - Regularly update Elastic Beanstalk platform
   - Monitor security advisories

---

## Next Steps

After completing this setup:

1. ✅ Update Netlify `VITE_API_URL` to use `https://api.clearways.ai/api`
2. ✅ Test OTP email sending with new domain
3. ✅ Monitor Elastic Beanstalk health and logs
4. ✅ Set up CloudWatch alarms for monitoring

---

## Support

If you encounter issues:
- Check Elastic Beanstalk environment health and logs
- Verify DNS records using `dig` or `nslookup`
- Review AWS documentation: https://docs.aws.amazon.com/elasticbeanstalk/

