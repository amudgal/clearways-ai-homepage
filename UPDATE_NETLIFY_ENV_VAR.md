# Update Netlify Environment Variable - Step by Step

## Current Issue

The frontend is still using the old Elastic Beanstalk URL:
- ❌ Current: `https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/api`
- ✅ Should be: `https://api.clearways.ai/api`

## Step-by-Step Instructions

### Step 1: Access Netlify Dashboard

1. Go to: https://app.netlify.com
2. Sign in to your account
3. Select your site (likely named `clearways-ai-homepage` or similar)

### Step 2: Navigate to Environment Variables

1. Click on **Site settings** (gear icon) in the top navigation
2. In the left sidebar, click **Environment variables**
3. You should see a list of environment variables including `VITE_API_URL`

### Step 3: Update VITE_API_URL

1. Find `VITE_API_URL` in the list
2. Click on it to edit (or click the **Edit** button if available)
3. **Delete the current value** (which is likely `https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/api` or `http://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/api`)
4. **Enter the new value**:
   ```
   https://api.clearways.ai/api
   ```
5. Make sure there are **no trailing slashes** (should end with `/api`, not `/api/`)
6. Click **Save** or **Update variable**

### Step 4: Verify the Update

After saving, verify the value is correct:
- It should show: `https://api.clearways.ai/api`
- Make sure it's set for **All scopes** or **Production** (not just Development)

### Step 5: Trigger New Deployment

**IMPORTANT**: Environment variable changes require a new deployment to take effect!

1. Go to the **Deploys** tab (in the top navigation)
2. Click **Trigger deploy** button (usually in the top right)
3. Select **Deploy site** from the dropdown
4. Wait for the deployment to complete (usually 2-5 minutes)
5. You'll see a new deployment appear in the list with status "Building" → "Published"

### Step 6: Clear Browser Cache

After deployment completes:

**Option A: Hard Reload**
1. Open your site: `https://www.clearways.ai/login`
2. Open browser developer tools (F12 or Cmd+Option+I)
3. Right-click the refresh button
4. Select **Empty Cache and Hard Reload**

**Option B: Incognito/Private Mode**
1. Open a new incognito/private browsing window
2. Go to `https://www.clearways.ai/login`
3. This bypasses cache automatically

### Step 7: Verify the Fix

1. Open browser developer tools (F12)
2. Go to **Console** tab
3. Go to **Network** tab (to see requests)
4. Try to send an OTP
5. Check the console - you should see:
   ```
   [AuthService] Sending OTP request to: https://api.clearways.ai/api/auth/otp/send
   ```
   ✅ **NOT** the old Elastic Beanstalk URL

6. Check the Network tab - the request should go to `api.clearways.ai`
7. No more certificate errors!

## Troubleshooting

### Still Seeing Old URL After Deployment

1. **Wait longer**: Sometimes it takes a few minutes for the new build to propagate
2. **Check deployment logs**: Go to Deploys tab → Click on the latest deployment → Check if it shows the new environment variable
3. **Verify environment variable**: Go back to Environment variables and confirm it's saved correctly
4. **Try incognito mode**: This ensures no cached JavaScript is being used

### Environment Variable Not Showing in Build

1. Make sure you saved the environment variable
2. Check the deployment scope: Set it to **All scopes** to ensure it's available in all contexts
3. Re-trigger deployment after confirming the variable is saved

### Still Getting Certificate Errors

1. Verify DNS: `dig api.clearways.ai` should return the Elastic Beanstalk IPs
2. Test directly: `curl -v https://api.clearways.ai/health` should work
3. Check browser console for the exact URL being used
4. Make sure you cleared browser cache

## Quick Checklist

- [ ] Updated `VITE_API_URL` to `https://api.clearways.ai/api` in Netlify
- [ ] Saved the environment variable
- [ ] Triggered new deployment
- [ ] Waited for deployment to complete (2-5 minutes)
- [ ] Cleared browser cache or used incognito mode
- [ ] Verified console shows new URL (`api.clearways.ai`)
- [ ] Tested OTP request - no certificate errors

## Expected Result

After completing these steps:
- ✅ Console shows: `[AuthService] Sending OTP request to: https://api.clearways.ai/api/auth/otp/send`
- ✅ No `ERR_CERT_COMMON_NAME_INVALID` errors
- ✅ No `ERR_BLOCKED_BY_CLIENT` errors (unless you have an ad blocker blocking the domain)
- ✅ OTP requests succeed
- ✅ Emails are sent successfully

