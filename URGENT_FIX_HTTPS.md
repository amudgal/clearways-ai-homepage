# URGENT: Backend Does Not Support HTTPS

## Problem Identified

**The backend only supports HTTP (port 80), not HTTPS (port 443).**

- ✅ HTTP works: `http://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/health` → 200 OK
- ❌ HTTPS times out: `https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/health` → Connection timeout

This is why OTP requests are timing out - the frontend is trying to use HTTPS but the backend doesn't support it.

## Solution Options

### Option 1: Configure HTTPS on Elastic Beanstalk (RECOMMENDED)

This is the proper solution for production.

#### Step 1: Get SSL Certificate

1. Go to **AWS Certificate Manager** (ACM)
   - https://console.aws.amazon.com/acm/
2. Click **Request a certificate**
3. Choose **Request a public certificate**
4. Enter domain: `clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com`
   - Or use a custom domain if you have one
5. Choose **DNS validation** (easier) or **Email validation**
6. Click **Request**
7. Complete validation (add DNS record or verify email)
8. Wait for certificate to be **Issued**

#### Step 2: Configure HTTPS Listener

1. Go to **Elastic Beanstalk** → Your Environment
2. Click **Configuration** → **Load balancer**
3. Click **Modify**
4. Under **Listeners**, you should see HTTP (port 80)
5. Click **Add listener**:
   - **Port**: 443
   - **Protocol**: HTTPS
   - **SSL certificate**: Select the certificate you just created
6. Click **Apply**
7. **Wait 5-10 minutes** for the environment to update

#### Step 3: Test HTTPS

```bash
curl -v https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/health
```

Should return 200 OK.

#### Step 4: Update Netlify

1. Go to **Netlify** → **Site settings** → **Environment variables**
2. Update `VITE_API_URL` to:
   ```
   https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/api
   ```
3. Trigger new deployment

### Option 2: Temporary Workaround (NOT RECOMMENDED)

**Only use this if you can't configure HTTPS immediately.**

#### Step 1: Update Netlify to Use HTTP

1. Go to **Netlify** → **Site settings** → **Environment variables**
2. Update `VITE_API_URL` to:
   ```
   http://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/api
   ```
3. Trigger new deployment

#### Step 2: Update Frontend Code

The code has been updated to allow HTTP when explicitly set, but you'll still get Mixed Content warnings.

**⚠️ WARNING:** This will cause Mixed Content errors in browsers. Some browsers may block the requests entirely.

## Why This Happened

Elastic Beanstalk environments don't automatically have HTTPS configured. You need to:
1. Create an SSL certificate in AWS Certificate Manager
2. Add an HTTPS listener to the load balancer
3. Configure the certificate

## Quick Test Commands

```bash
# Test HTTP (should work)
curl http://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/health

# Test HTTPS (will timeout until configured)
curl https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/health

# Test OPTIONS with HTTP
curl -v -X OPTIONS \
  http://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/api/auth/otp/send \
  -H "Origin: https://www.clearways.ai" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

## Next Steps

1. **Configure HTTPS on Elastic Beanstalk** (Option 1) - This is the proper solution
2. **Update CORS_ORIGIN** in Elastic Beanstalk to include your frontend URLs
3. **Restart the environment** after changes
4. **Test the OTP flow** again

## Timeline

- **HTTPS Configuration**: 15-30 minutes (certificate validation + environment update)
- **Testing**: 5 minutes
- **Total**: ~30-45 minutes

The backend is working fine on HTTP - it just needs HTTPS configured for production use with your HTTPS frontend.

