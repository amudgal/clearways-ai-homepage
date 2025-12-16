# Verify Environment Variable in Netlify Build

## Problem

Even after deployment, the frontend might still use the old URL if:
1. The environment variable wasn't updated in Netlify
2. The build used a cached value
3. The browser is using cached JavaScript

## How to Verify

### Step 1: Check What URL is in the Built JavaScript

The API URL gets baked into the JavaScript at build time. Let's check what was actually built:

1. **Go to your deployed site**: https://www.clearways.ai
2. **Open browser developer tools** (F12)
3. **Go to Network tab**
4. **Refresh the page** (Cmd+R or Ctrl+R)
5. **Find the main JavaScript file** (looks like `index-XXXXX.js`, e.g., `index-CMf6HEZO.js`)
6. **Right-click on it** → **Open in new tab**
7. **Search for** (Cmd+F or Ctrl+F):
   - Search for: `clearways-ai-backend-env.eba-skxjjmed`
   - OR search for: `api.clearways.ai`

**What to look for:**
- ✅ If you find `api.clearways.ai` → Environment variable is correct!
- ❌ If you find `clearways-ai-backend-env.eba-skxjjmed` → Environment variable was NOT updated

### Step 2: Verify Environment Variable in Netlify

1. Go to: https://app.netlify.com
2. Select your site
3. **Site settings** → **Environment variables**
4. Find `VITE_API_URL`
5. **Verify the value is**: `https://api.clearways.ai/api`
   - If it's still the old URL → **Update it now!**
   - If it's correct → Proceed to Step 3

### Step 3: Check Build Logs for Environment Variables

Netlify build logs sometimes show environment variables. Check:

1. Go to **Deploys** tab
2. Click on the **latest deployment** (the one that just completed)
3. Scroll through the build logs
4. Look for any mention of `VITE_API_URL` or environment variables
5. If you see it, verify the value

**Note**: Netlify doesn't always show environment variable values in logs for security reasons, so this might not be visible.

### Step 4: If URL is Wrong - Fix It

If the built JavaScript still has the old URL:

1. **Update environment variable**:
   - Go to **Site settings** → **Environment variables**
   - Edit `VITE_API_URL`
   - Set to: `https://api.clearways.ai/api`
   - Click **Save**

2. **Trigger NEW deployment**:
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**
   - **Wait for deployment to complete** (2-5 minutes)

3. **Clear browser cache**:
   - Use **incognito/private mode**, OR
   - F12 → Right-click refresh → **Empty Cache and Hard Reload**

4. **Verify again** (repeat Step 1)

## Quick Test

After deployment, open browser console and check:
```
[AuthService] Sending OTP request to: https://api.clearways.ai/api/auth/otp/send
```

If you still see the old Elastic Beanstalk URL, the environment variable wasn't updated correctly.

## Common Issues

### Issue 1: Environment Variable Not Set for Production

- Check the **Scopes** setting for `VITE_API_URL`
- It should be set to **"All scopes"** or at least **"Production"**
- If it's only set for "Development", production builds won't use it

### Issue 2: Build Cache

- Netlify might be using cached build artifacts
- Try **clearing build cache**:
  - Go to **Site settings** → **Build & deploy** → **Clear cache and retry deploy**

### Issue 3: Browser Cache

- The browser might be serving old JavaScript
- Always test in **incognito mode** after deployment
- Or do a **hard reload** (Cmd+Shift+R or Ctrl+Shift+R)

## Expected Result

After fixing:
- ✅ Built JavaScript contains: `api.clearways.ai`
- ✅ Console shows: `[AuthService] Sending OTP request to: https://api.clearways.ai/api/auth/otp/send`
- ✅ No certificate errors
- ✅ OTP requests succeed

