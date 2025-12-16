# Fix: OTP Request Timeout (30 seconds)

## Problem
The request is being sent but timing out after 30 seconds with "AbortError: signal is aborted without reason". This means the backend is **not responding at all**.

## Most Likely Cause: CORS Preflight Failure

When a browser makes a cross-origin request, it first sends an **OPTIONS** request (preflight). If this fails, the actual POST request never happens, causing a timeout.

## Step 1: Check Network Tab

1. Open **Developer Tools** (F12)
2. Go to **Network** tab
3. **Clear** the network log
4. Try sending OTP again
5. Look for:

### A. OPTIONS Request (CORS Preflight)
- Should appear **before** the POST request
- **Status should be 200 or 204**
- If it's **404, 403, or shows CORS error**: This is the problem!

### B. POST Request
- If OPTIONS fails, POST might not even appear
- Or POST shows "blocked" or "CORS error"

## Step 2: Fix CORS in Elastic Beanstalk

### Option A: Via AWS Console (Easiest)

1. Go to **AWS Console** → **Elastic Beanstalk**
2. Select environment: `clearways-ai-backend-env`
3. Click **Configuration** → **Software**
4. Scroll to **Environment properties**
5. Find or add `CORS_ORIGIN`:
   ```
   https://www.clearways.ai,https://clearways.ai,https://clearways-ai-homepage.netlify.app
   ```
6. Click **Apply**
7. **Wait for environment to update** (2-3 minutes)

### Option B: Via EB CLI

```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server

eb setenv CORS_ORIGIN="https://www.clearways.ai,https://clearways.ai,https://clearways-ai-homepage.netlify.app"
```

## Step 3: Restart Environment (Important!)

After updating CORS_ORIGIN:

1. Go to **Elastic Beanstalk** → Your Environment
2. Click **Actions** → **Restart app server(s)**
3. Wait for restart to complete

## Step 4: Verify Backend Supports HTTPS

The backend **must** support HTTPS. Check:

1. **Elastic Beanstalk** → **Configuration** → **Load balancer**
2. Look for **HTTPS listener** on port 443
3. If missing:
   - Click **Modify**
   - Add listener: Port 443, Protocol HTTPS
   - Select SSL certificate (create in AWS Certificate Manager if needed)
   - Click **Apply**

## Step 5: Test Backend Directly

Test if the backend is responding:

```bash
# Test health endpoint
curl -v https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/health

# Test OPTIONS (CORS preflight)
curl -v -X OPTIONS \
  https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/api/auth/otp/send \
  -H "Origin: https://www.clearways.ai" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"

# Test POST request
curl -v -X POST \
  https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -H "Origin: https://www.clearways.ai" \
  -d '{"email":"test@clearways.ai"}'
```

**Expected responses:**
- Health: `200 OK` with JSON
- OPTIONS: `200 OK` or `204 No Content` with CORS headers
- POST: `200 OK` with JSON response

## Step 6: Check Backend Code

Verify the backend CORS configuration in `server/src/index.ts`:

```typescript
// Should allow your origins
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'https://clearways.ai', 'https://www.clearways.ai'];
```

## Quick Checklist

- [ ] Check Network tab for OPTIONS request status
- [ ] Verify `CORS_ORIGIN` in Elastic Beanstalk includes your frontend URL
- [ ] Restart Elastic Beanstalk environment after updating CORS
- [ ] Verify backend supports HTTPS (port 443 listener)
- [ ] Test backend directly with curl commands
- [ ] Check Elastic Beanstalk logs for errors

## If Still Not Working

1. **Check Elastic Beanstalk Logs:**
   - Go to **Logs** → **Request Logs** → **Last 100 Lines**
   - Look for CORS errors or request failures

2. **Check Environment Health:**
   - Environment status should be **Green/Ok**
   - If Yellow/Red, there's an issue with the backend

3. **Verify Database Connection:**
   - Check if database credentials are correct
   - Database might be blocking connections

4. **Test with HTTP (temporarily):**
   - If HTTPS isn't working, test with HTTP to isolate the issue
   - Change `VITE_API_URL` to HTTP temporarily
   - **Note:** This won't work in production due to Mixed Content, but helps debug

## Common CORS Issues

### Issue: OPTIONS returns 404
**Cause:** Backend doesn't handle OPTIONS requests
**Fix:** CORS middleware should handle this automatically - check backend code

### Issue: OPTIONS returns 403
**Cause:** CORS_ORIGIN doesn't match frontend URL exactly
**Fix:** Update CORS_ORIGIN to include exact frontend URL

### Issue: No OPTIONS request appears
**Cause:** Browser is blocking it or request is same-origin
**Fix:** Check if frontend and backend are on same domain (they shouldn't be)

### Issue: OPTIONS succeeds but POST fails
**Cause:** CORS headers missing on POST response
**Fix:** Verify backend sends CORS headers on all responses

