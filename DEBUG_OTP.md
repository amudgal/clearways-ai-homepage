# Debugging OTP Request Issues

## Current Issue: Request Sent But No Response

The request is being sent to the backend but the screen doesn't move forward. This usually means:
1. **CORS preflight is failing** (most common)
2. **Backend is not responding** (timeout)
3. **Response is being blocked** by browser

## Step-by-Step Debugging

### 1. Check Browser Console

Open Developer Tools (F12) → **Console** tab and look for:
- `[AuthService] Sending OTP request to: ...`
- `[AuthService] Response received - Status: ...`
- Any error messages

### 2. Check Network Tab

Open Developer Tools (F12) → **Network** tab:

1. **Clear the network log**
2. **Try sending OTP again**
3. **Look for the request** to `/api/auth/otp/send`

**What to check:**

#### A. Preflight Request (OPTIONS)
- Look for an **OPTIONS** request before the POST
- **Status should be 200 or 204**
- If it's **404, 403, or CORS error**: Backend CORS is misconfigured

#### B. POST Request
- **Status code**: Should be 200
- **Response**: Should contain JSON with `success: true`
- **Time**: Should complete in < 5 seconds

#### C. If Request Shows "Pending" or "Failed"
- **Pending**: Backend is not responding (check Elastic Beanstalk)
- **Failed**: Network/CORS issue

### 3. Check Backend Logs

1. Go to **AWS Console** → **Elastic Beanstalk**
2. Select your environment: `clearways-ai-backend-env`
3. Click **Logs** → **Request Logs** → **Last 100 Lines**
4. Look for:
   - OTP request logs
   - CORS errors
   - Email sending errors

### 4. Test Backend Directly

Test if the backend is responding:

```bash
# Test health endpoint
curl -v https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/health

# Test OTP endpoint (replace with your email domain)
curl -v -X POST https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -H "Origin: https://www.clearways.ai" \
  -d '{"email":"test@yourdomain.com"}'
```

**What to look for:**
- `200 OK` response = Backend is working
- `CORS` errors = CORS misconfigured
- `Connection refused` = Backend is down
- `SSL/TLS` errors = HTTPS not configured

### 5. Verify CORS Configuration

In Elastic Beanstalk → **Configuration** → **Software** → **Environment properties**:

Check `CORS_ORIGIN` includes:
```
https://www.clearways.ai,https://clearways.ai,https://clearways-ai-homepage.netlify.app
```

**Important:**
- Must include **exact** frontend URL (with https://)
- No trailing slashes
- Comma-separated (no spaces after commas)

### 6. Common Issues and Fixes

#### Issue: CORS Preflight Failing
**Symptoms:** OPTIONS request returns 404 or CORS error

**Fix:**
1. Verify `CORS_ORIGIN` in Elastic Beanstalk includes your frontend URL
2. Restart Elastic Beanstalk environment: **Actions** → **Restart app server(s)**
3. Check backend code allows OPTIONS requests (should be handled by `cors` middleware)

#### Issue: Request Times Out
**Symptoms:** Request shows "Pending" for 30+ seconds, then fails

**Fix:**
1. Check Elastic Beanstalk environment health (should be green)
2. Check backend logs for errors
3. Verify database connection is working
4. Check if email service is hanging (if configured)

#### Issue: Backend Returns 500 Error
**Symptoms:** POST request returns status 500

**Fix:**
1. Check Elastic Beanstalk logs for error details
2. Verify all environment variables are set:
   - Database credentials
   - JWT_SECRET
   - Email configuration (if using)
3. Check database connection

#### Issue: "Corporate email domain not recognized"
**Symptoms:** Request succeeds but returns this error

**Fix:**
1. The email domain must be in the `site_tenants` table
2. Add the domain to the database first
3. Domain must have status = 'ACTIVE'

## Quick Test Checklist

After deploying the updated code with better logging:

1. [ ] Open browser console (F12)
2. [ ] Try sending OTP
3. [ ] Check console for `[AuthService]` logs
4. [ ] Check Network tab for request status
5. [ ] If CORS error: Update `CORS_ORIGIN` in Elastic Beanstalk
6. [ ] If timeout: Check Elastic Beanstalk health and logs
7. [ ] If 500 error: Check backend logs for details

## Next Steps

1. **Deploy the updated frontend** (with improved logging)
2. **Test again** and check browser console
3. **Share the console output** - it will show exactly what's failing

The improved logging will show:
- Exact API URL being used
- Response status and headers
- Detailed error messages
- Whether it's a timeout, CORS, or server error

