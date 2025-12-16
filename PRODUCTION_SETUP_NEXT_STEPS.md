# Production Setup - Next Steps After DNS Records Added ✅

You've successfully added the DNS records. Here's what to do next:

## Step 1: Verify Certificate Validation (5-30 minutes)

Wait for AWS to validate your certificate. Check the status:

```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server
./check-cert-status.sh
```

Or manually:
```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:194893387380:certificate/aa0de9b8-d11b-4191-a65c-1eabd15c53c3 \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text
```

**Wait until status shows `ISSUED`** (this can take 5-30 minutes after DNS records are added).

### Verify DNS Records Are Live

Check if DNS records have propagated:

```bash
# Check certificate validation record
dig CNAME _27ce3527ae120a3110267b9c8ca81674.api.clearways.ai

# Check API subdomain
dig CNAME api.clearways.ai
```

Both should return the correct CNAME values.

## Step 2: Configure HTTPS Listener in Elastic Beanstalk ✅

**COMPLETED via AWS CLI** - The HTTPS listener has been configured. Environment is updating (takes 5-10 minutes).

To check status:
```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server
./check-https-status.sh
```

### Alternative Methods (for reference):

### Option A: Using AWS Console

1. Go to **AWS Console** → **Elastic Beanstalk**
2. Select environment: `clearways-ai-backend-env`
3. Click **Configuration** → **Load balancer**
4. Click **Modify**
5. Under **Listeners**, you should see HTTP (port 80)
6. Click **Add listener**:
   - **Port**: `443`
   - **Protocol**: `HTTPS`
   - **SSL certificate**: Select `api.clearways.ai` from dropdown (or paste ARN: `arn:aws:acm:us-east-1:194893387380:certificate/aa0de9b8-d11b-4191-a65c-1eabd15c53c3`)
7. Click **Apply**
8. **Wait 5-10 minutes** for environment update to complete

### Option B: Using AWS CLI

```bash
# Get environment details
ENV_NAME="clearways-ai-backend-env"
APP_NAME="clearways-ai-backend"
CERT_ARN="arn:aws:acm:us-east-1:194893387380:certificate/aa0de9b8-d11b-4191-a65c-1eabd15c53c3"

# Create .ebextensions configuration
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server
mkdir -p .ebextensions

cat > .ebextensions/01-https.config <<EOF
option_settings:
  aws:elbv2:listener:443:
    Protocol: HTTPS
    SSLCertificateArns: $CERT_ARN
    DefaultProcess: default
EOF

# Deploy configuration
eb deploy
```

## Step 3: Test HTTPS Endpoint

After Elastic Beanstalk update completes, test HTTPS:

```bash
# Test custom domain HTTPS
curl -v https://api.clearways.ai/health

# Should return 200 OK with JSON response
# If it works, you'll see SSL handshake and response
```

If you get connection timeout or errors, wait a few more minutes and try again.

## Step 4: Update Netlify Environment Variable

1. Go to **Netlify Dashboard**: https://app.netlify.com
2. Select your site: `clearways-ai-homepage` (or your site name)
3. Go to **Site settings** → **Environment variables**
4. Find `VITE_API_URL` and update it to:
   ```
   https://api.clearways.ai/api
   ```
5. Click **Save**
6. **Trigger new deployment**:
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**
   - Wait for deployment to complete

## Step 5: Update CORS Configuration

Update CORS to allow requests from your frontend:

```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server

eb setenv CORS_ORIGIN="https://www.clearways.ai,https://clearways.ai,https://clearways-ai-homepage.netlify.app"
```

Or via AWS Console:
- Elastic Beanstalk → Configuration → Software → Environment properties
- Update `CORS_ORIGIN` to: `https://www.clearways.ai,https://clearways.ai,https://clearways-ai-homepage.netlify.app`
- Click **Apply**

## Step 6: Test Complete Flow

1. **Test API directly:**
   ```bash
   curl https://api.clearways.ai/api/health
   ```

2. **Test from frontend:**
   - Go to `https://www.clearways.ai/login`
   - Enter a corporate email
   - Click "Send OTP"
   - Check browser console (F12) for any errors
   - Check email for OTP code

3. **Verify HTTPS in browser:**
   - Open browser developer tools (F12)
   - Go to Network tab
   - Look for requests to `api.clearways.ai`
   - Verify they show as HTTPS (not HTTP)
   - Check for any CORS or SSL errors

## Troubleshooting

### Certificate Status Stays PENDING_VALIDATION

- **Wait longer**: Can take up to 30 minutes
- **Verify DNS record**: 
  ```bash
  dig CNAME _27ce3527ae120a3110267b9c8ca81674.api.clearways.ai
  ```
  Should return: `_f34709774c583e5ec38edb9be0af364c.jkddzztszm.acm-validations.aws.`
- **Check DNS provider**: Make sure record was saved correctly

### HTTPS Connection Times Out

- **Wait for Elastic Beanstalk update**: Takes 5-10 minutes after adding listener
- **Check listener configuration**: Verify HTTPS listener (port 443) is active
- **Verify security groups**: Load balancer security group should allow port 443
- **Test again**: Sometimes takes a few minutes after configuration

### Custom Domain Not Resolving

- **Check DNS propagation**:
  ```bash
  dig CNAME api.clearways.ai
  ```
  Should return: `clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com`
- **Wait for DNS propagation**: Can take 5-30 minutes
- **Verify CNAME record**: Check DNS provider interface

### CORS Errors

- **Verify CORS_ORIGIN**: Should include all frontend URLs
- **Check backend logs**: Elastic Beanstalk → Logs → Request logs
- **Verify frontend URL**: Make sure `VITE_API_URL` is set correctly in Netlify

### OTP Not Sending

- **Check browser console**: Look for network errors
- **Verify API URL**: Should be `https://api.clearways.ai/api`
- **Check backend logs**: Elastic Beanstalk → Logs → Recent logs
- **Verify email service**: Check environment variables for email configuration

## Quick Checklist

- [ ] Wait for certificate status = **ISSUED** (check with `./check-cert-status.sh`)
- [ ] Configure HTTPS listener in Elastic Beanstalk (port 443)
- [ ] Wait for Elastic Beanstalk update to complete (5-10 minutes)
- [ ] Test `https://api.clearways.ai/health` (should return 200 OK)
- [ ] Update Netlify `VITE_API_URL` to `https://api.clearways.ai/api`
- [ ] Trigger new Netlify deployment
- [ ] Update `CORS_ORIGIN` in Elastic Beanstalk
- [ ] Test OTP flow from `https://www.clearways.ai/login`
- [ ] Verify no errors in browser console

## Expected Timeline

- **DNS Propagation**: 5-30 minutes (usually faster)
- **Certificate Validation**: 5-30 minutes after DNS records added
- **Elastic Beanstalk Update**: 5-10 minutes after configuring HTTPS listener
- **Netlify Deployment**: 2-5 minutes
- **Total**: ~20-75 minutes from DNS records to fully working

## Success Indicators

✅ Certificate status = `ISSUED`  
✅ `curl https://api.clearways.ai/health` returns 200 OK  
✅ Browser shows HTTPS connection (green lock icon)  
✅ OTP emails are received  
✅ No CORS errors in browser console  
✅ Frontend successfully communicates with backend

## Need Help?

If you encounter issues:
1. Check Elastic Beanstalk environment health
2. Review CloudWatch logs for errors
3. Verify all environment variables are set
4. Check security group rules allow port 443

