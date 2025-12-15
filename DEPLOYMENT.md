# Deployment Guide

## GitHub Repository
✅ Repository created and code pushed to: https://github.com/amudgal/clearways-ai-homepage

## Netlify Deployment

The project is configured for Netlify deployment with:
- `netlify.toml` configuration file
- SPA routing support (all routes redirect to index.html)
- Build output directory: `dist`

### Option 1: Deploy via Netlify Dashboard (Recommended)

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Select "GitHub" and authorize if needed
4. Choose the repository: `amudgal/clearways-ai-homepage`
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Click "Deploy site"

Netlify will automatically:
- Build your site on every push to the repository
- Deploy previews for pull requests
- Handle SPA routing automatically (via netlify.toml)

### Option 2: Deploy via Netlify CLI

If you prefer using the CLI:

```bash
# Link to a new site
netlify init

# Or deploy directly (after linking)
netlify deploy --prod --dir=dist
```

### Environment Variables

**Required for Production:**

The frontend needs to know where the backend API is located. You must set the `VITE_API_URL` environment variable in Netlify:

1. Go to Netlify Dashboard → Your Site → **Site settings** → **Environment variables**
2. Click **Add variable**
3. Add the following:
   - **Key**: `VITE_API_URL`
   - **Value**: Your backend API URL (e.g., `https://api.clearways.ai/api` or `https://your-backend-domain.com/api`)
   - **Scopes**: Select "Production", "Deploy previews", and "Branch deploys" as needed
4. Click **Save**

**Important Notes:**
- The backend must be deployed and accessible before setting this variable
- The URL should include the `/api` path if your backend serves the API under that path
- After adding the variable, trigger a new deployment (or it will auto-deploy on the next push)
- The backend must have CORS configured to allow requests from your Netlify domain

**Backend Deployment:**
- The backend server needs to be deployed separately (e.g., AWS EC2, ECS, Railway, Render, etc.)
- See `server/SETUP.md` and `server/README.md` for backend deployment instructions
- Ensure the backend is accessible via HTTPS in production

### Custom Domain: www.clearways.ai

To configure the site to be reachable at **www.clearways.ai**:

#### Step 1: Deploy to Netlify (if not done yet)
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Select "GitHub" and authorize if needed
4. Choose the repository: `amudgal/clearways-ai-homepage`
5. Build settings (should auto-detect):
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Click "Deploy site"

#### Step 2: Configure Custom Domain
1. In Netlify Dashboard, go to your site
2. Navigate to **Site settings** → **Domain management**
3. Click **Add custom domain**
4. Enter: `www.clearways.ai`
5. Click **Verify**

#### Step 3: Configure DNS Records
Netlify will provide you with DNS records. You need to add these to your DNS provider (wherever `clearways.ai` is registered):

**Option A: Using CNAME (Recommended for www subdomain)**
- **Type**: CNAME
- **Name**: `www`
- **Value**: `[your-netlify-site].netlify.app` (Netlify will show the exact value)
- **TTL**: 3600 (or default)

**Option B: Using A Record (if CNAME not supported)**
- Netlify will provide A record IP addresses to use

#### Step 4: SSL Certificate
- Netlify will automatically provision an SSL certificate via Let's Encrypt
- This usually takes a few minutes after DNS is configured
- The site will be accessible at `https://www.clearways.ai` once DNS propagates

#### Step 5: Redirect clearways.ai to www.clearways.ai (Optional)
If you want the apex domain to redirect to www:
1. In Domain management, also add `clearways.ai` (without www)
2. Go to **Site settings** → **Domain management** → **HTTPS**
3. Enable "Force HTTPS"
4. Add redirect rule in `netlify.toml` (already configured)

**Note**: DNS propagation can take 24-48 hours, but usually completes within a few hours.

## Build Commands Reference

- **Development**: `npm run dev`
- **Production Build**: `npm run build`
- **Build Output**: `dist/` directory

