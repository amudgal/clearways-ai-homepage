# Troubleshooting Guide

## OTP Request Stuck on "Sending"

If the OTP request gets stuck on "Sending" and nothing happens, check the following:

### 1. Update Netlify Environment Variable to HTTPS

**Current Issue:** Your `VITE_API_URL` is set to HTTP, but it needs to be HTTPS.

**Fix:**
1. Go to Netlify Dashboard → Your Site → **Site settings** → **Environment variables**
2. Find `VITE_API_URL`
3. **Change the value from:**
   ```
   http://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/api
   ```
   **To:**
   ```
   https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/api
   ```
4. Click **Save**
5. **Trigger a new deployment:**
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**

### 2. Verify Backend Supports HTTPS

Your Elastic Beanstalk backend must support HTTPS. Check:

1. **Go to AWS Console** → **Elastic Beanstalk** → Your Environment
2. **Configuration** → **Load balancer**
3. Check if there's an HTTPS listener (port 443)

**If HTTPS is NOT configured:**

You have two options:

#### Option A: Configure HTTPS on Elastic Beanstalk (Recommended)

1. Go to **Configuration** → **Load balancer**
2. Click **Modify**
3. Under **Listeners**, add:
   - **Port**: 443
   - **Protocol**: HTTPS
   - **SSL certificate**: Select or create one in AWS Certificate Manager
4. Click **Apply**
5. Wait for the environment to update

#### Option B: Use HTTP (Not Recommended for Production)

If you can't configure HTTPS immediately, you can temporarily:
1. Keep `VITE_API_URL` as HTTP in Netlify
2. The frontend will still convert it to HTTPS, but it will fail
3. **This is not recommended** - configure HTTPS instead

### 3. Check CORS Configuration

Make sure your backend has the correct CORS origin:

1. Go to **Elastic Beanstalk** → **Configuration** → **Software**
2. Check `CORS_ORIGIN` environment variable
3. It should include:
   ```
   https://www.clearways.ai,https://clearways.ai,https://clearways-ai-homepage.netlify.app
   ```
4. If missing or incorrect, add/update it and click **Apply**

### 4. Check Browser Console

Open browser Developer Tools (F12) and check:

1. **Console tab** - Look for error messages
2. **Network tab** - Check the OTP request:
   - Status code (should be 200)
   - Response body
   - Any CORS errors

### 5. Check Backend Logs

1. Go to **Elastic Beanstalk** → **Logs**
2. Click **Request Logs** → **Last 100 Lines**
3. Look for:
   - OTP request logs
   - Email sending errors
   - CORS errors
   - Database connection errors

### 6. Verify Email Service is Configured

If OTP requests succeed but emails aren't sent:

1. Check Elastic Beanstalk environment variables:
   - `EMAIL_HOST`
   - `EMAIL_USER`
   - `EMAIL_PASSWORD`
   - `EMAIL_FROM`

2. See `server/PRODUCTION_SETUP.md` for email configuration

### 7. Test Backend Directly

Test if the backend is working:

```bash
# Test health endpoint
curl https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/health

# Test OTP endpoint (replace with your email domain)
curl -X POST https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -H "Origin: https://www.clearways.ai" \
  -d '{"email":"test@yourdomain.com"}'
```

## Common Error Messages

### "Network error: Cannot connect to server"
- Backend is down or unreachable
- Check Elastic Beanstalk environment health
- Verify the URL is correct

### "CORS policy" errors
- `CORS_ORIGIN` not set correctly in backend
- Frontend URL not included in allowed origins
- Fix: Update `CORS_ORIGIN` in Elastic Beanstalk

### "Server error (500)"
- Backend application error
- Check Elastic Beanstalk logs
- Verify database connection
- Check email service configuration

### "Corporate email domain not recognized"
- Email domain not in `site_tenants` table
- Add the domain to the database first

## Quick Checklist

- [ ] `VITE_API_URL` in Netlify is set to **HTTPS** (not HTTP)
- [ ] Netlify site has been redeployed after changing `VITE_API_URL`
- [ ] Backend Elastic Beanstalk environment supports HTTPS (port 443 listener)
- [ ] `CORS_ORIGIN` in Elastic Beanstalk includes your frontend URLs
- [ ] Email service is configured in Elastic Beanstalk environment variables
- [ ] Backend health check returns 200: `/health`
- [ ] Browser console shows no CORS errors
- [ ] Backend logs show OTP requests are received

