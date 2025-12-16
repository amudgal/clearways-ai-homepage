# Netlify Environment Variable Setup

## Critical: Set VITE_API_URL for Production

The frontend needs to know where the backend API is located. Without this, it will default to `localhost:3001`, which won't work in production.

### Steps to Configure:

1. **Go to Netlify Dashboard**
   - Navigate to: https://app.netlify.com
   - Select your site (clearways.ai)

2. **Navigate to Environment Variables**
   - Go to: **Site settings** → **Environment variables**
   - Or: **Site settings** → **Build & deploy** → **Environment**

3. **Add the Production Backend URL**
   - Click **Add variable**
   - **Key**: `VITE_API_URL`
   - **Value**: `https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/api`
   - **⚠️ CRITICAL: Must use HTTPS, not HTTP!** The frontend is served over HTTPS, so the backend must also use HTTPS to avoid Mixed Content errors.
   - **Scopes**: 
     - ✅ Production
     - ✅ Deploy previews (optional)
     - ✅ Branch deploys (optional)
   - Click **Save**

4. **Trigger a New Deployment**
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**
   - This rebuilds the frontend with the new environment variable

### Verify It's Working:

After deployment, check the browser console:
- The frontend should call: `https://clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com/api/auth/otp/send`
- NOT: `http://localhost:3001/api/auth/otp/send`
- **⚠️ Must use HTTPS, not HTTP!**

### Important Notes:

- **Vite environment variables** must be prefixed with `VITE_` to be accessible in the frontend code
- Environment variables are **baked into the build** at build time, not runtime
- You **must redeploy** after adding/changing environment variables
- The backend URL should include `/api` at the end

### Troubleshooting:

If you still see `localhost:3001` in the network tab:
1. Verify the environment variable is set correctly in Netlify
2. Check that you triggered a new deployment after setting it
3. Clear your browser cache and hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
4. Check the build logs in Netlify to ensure the variable was available during build

