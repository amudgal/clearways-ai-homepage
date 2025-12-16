# Force New Deployment with Correct Environment Variable

## Issue

Even though `VITE_API_URL` is set correctly in Netlify, the browser is still using the old URL. This means the JavaScript bundle was built with the old value and needs to be rebuilt.

## Solution: Force a Fresh Deployment

### Step 1: Verify Environment Variable Scope

1. Go to **Netlify Dashboard** → Your Site
2. **Site settings** → **Environment variables**
3. Find `VITE_API_URL`
4. **Check the "Scopes" column**:
   - ✅ Should show: **"All scopes"** or at least **"Production"**
   - ❌ If it only shows "Development" or "Deploy previews" → **Click to edit** and change scope to **"All scopes"**
5. **Verify the value** is: `https://api.clearways.ai/api`
6. Click **Save** if you made any changes

### Step 2: Clear Build Cache (Important!)

Netlify might be using cached build artifacts. Clear the cache:

1. Go to **Site settings** → **Build & deploy**
2. Scroll down to **Build settings**
3. Look for **"Clear cache and retry deploy"** button (if available)
4. OR manually clear cache:
   - Go to **Deploys** tab
   - Click on the **latest deployment**
   - Look for **"Clear cache and retry deploy"** option

**Alternative method:**
1. Go to **Site settings** → **Build & deploy** → **Build settings**
2. Under **Build command**, temporarily add a comment or space
3. Save (this forces a rebuild)
4. Then revert it back

### Step 3: Trigger Fresh Deployment

1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**
3. **Wait for deployment to complete** (2-5 minutes)
4. Watch the build logs to ensure it's a fresh build (not using cache)

### Step 4: Verify New Build

After deployment completes:

1. **Check the JavaScript file name** - it should be different (e.g., `index-XXXXX.js` with different hash)
2. **Open the site in incognito mode** (to avoid cache)
3. **Open browser console** (F12)
4. **Check the Network tab** - find the new JavaScript file
5. **Right-click** → **Open in new tab**
6. **Search for** `api.clearways.ai` - it should be there!
7. **Search for** `clearways-ai-backend-env.eba-skxjjmed` - it should NOT be there!

### Step 5: Test

1. Go to `https://www.clearways.ai/login` in **incognito mode**
2. Open browser console (F12)
3. Try to send OTP
4. Check console - should see:
   ```
   [AuthService] Sending OTP request to: https://api.clearways.ai/api/auth/otp/send
   ```
5. ✅ No more certificate errors!

## If Still Not Working

### Check Build Logs

1. Go to **Deploys** tab
2. Click on the **latest deployment**
3. Check the build logs
4. Look for any errors or warnings about environment variables
5. Verify the build actually ran (not skipped due to no changes)

### Manual Verification

1. **Download the built JavaScript**:
   - Go to your site: `https://www.clearways.ai`
   - Open Network tab (F12)
   - Find `index-XXXXX.js`
   - Right-click → Save as
2. **Search the file** for:
   - `clearways-ai-backend-env.eba-skxjjmed` → If found, environment variable wasn't used
   - `api.clearways.ai` → If found, environment variable was used correctly

### Nuclear Option: Delete and Re-add Environment Variable

If nothing else works:

1. Go to **Environment variables**
2. **Delete** `VITE_API_URL`
3. **Add it again**:
   - Key: `VITE_API_URL`
   - Value: `https://api.clearways.ai/api`
   - Scope: **All scopes**
4. **Save**
5. **Trigger new deployment**
6. **Wait for completion**
7. **Test in incognito mode**

## Common Mistakes

❌ **Updated variable but didn't trigger deployment**  
✅ **Solution**: Always trigger a new deployment after updating environment variables

❌ **Variable set for wrong scope**  
✅ **Solution**: Set scope to "All scopes" or at least "Production"

❌ **Testing in regular browser (cached JavaScript)**  
✅ **Solution**: Always test in incognito mode after deployment

❌ **Build used cached artifacts**  
✅ **Solution**: Clear build cache before deploying

## Expected Timeline

- **Clear cache**: 1 minute
- **Trigger deployment**: 1 minute
- **Build time**: 2-5 minutes
- **Total**: ~5-7 minutes

## Success Indicators

After completing these steps:
- ✅ New JavaScript file has different hash (e.g., `index-XXXXX.js` where XXXXX is different)
- ✅ Console shows: `[AuthService] Sending OTP request to: https://api.clearways.ai/api/auth/otp/send`
- ✅ No `ERR_CERT_COMMON_NAME_INVALID` errors
- ✅ OTP requests succeed

