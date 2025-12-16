# Fix ERR_CERT_COMMON_NAME_INVALID Error

## Problem

The error `ERR_CERT_COMMON_NAME_INVALID` means the SSL certificate domain doesn't match the URL the browser is trying to access.

## Root Cause

The Netlify environment variable `VITE_API_URL` is likely still pointing to the old Elastic Beanstalk URL (e.g., `clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com`), which doesn't have a certificate. The certificate is only for `api.clearways.ai`.

## Solution

Update the Netlify environment variable to use the custom domain:

### Step 1: Update Netlify Environment Variable

1. Go to **Netlify Dashboard**: https://app.netlify.com
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Find `VITE_API_URL` and update it to:
   ```
   https://api.clearways.ai/api
   ```
5. Click **Save**

### Step 2: Trigger New Deployment

1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**
3. Wait for deployment to complete (2-5 minutes)

### Step 3: Clear Browser Cache

After deployment:
1. Open browser developer tools (F12)
2. Right-click the refresh button
3. Select **Empty Cache and Hard Reload**
4. Or use incognito/private browsing mode

### Step 4: Test

1. Go to `https://www.clearways.ai/login`
2. Enter corporate email
3. Click "Send OTP"
4. Check browser console (F12) - should see requests to `https://api.clearways.ai/api/auth/otp/send`
5. No more certificate errors!

## Verification

After updating, check the browser console. You should see:
```
[AuthService] Sending OTP request to: https://api.clearways.ai/api/auth/otp/send
```

Instead of:
```
[AuthService] Sending OTP request to: https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/api/auth/otp/send
```

## Current Certificate Status

✅ Certificate is correctly configured for `api.clearways.ai`  
✅ HTTPS listener is active on port 443  
✅ Certificate is attached to load balancer  
✅ DNS is correctly pointing to the load balancer  

The only issue is the frontend URL needs to be updated in Netlify.

