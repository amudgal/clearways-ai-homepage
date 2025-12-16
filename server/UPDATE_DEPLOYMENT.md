# Update Existing Elastic Beanstalk Deployment

This guide shows how to upload new code to your existing Elastic Beanstalk environment.

## Method 1: Using AWS Console (No Installation Required) ⭐ Easiest

### Step 1: Build and Package

```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server

# Install dependencies (if needed)
npm install

# Build TypeScript to JavaScript
npm run build

# Create deployment ZIP (excludes node_modules, .git, etc.)
zip -r deploy.zip . \
  -x "node_modules/*" \
  -x ".git/*" \
  -x "*.log" \
  -x ".env" \
  -x "*.zip" \
  -x "dist/*.map"
```

### Step 2: Upload via AWS Console

1. **Go to AWS Elastic Beanstalk Console**
   - https://console.aws.amazon.com/elasticbeanstalk/
   - Select your environment: `clearways-ai-backend-env`

2. **Upload New Version**
   - Click **"Upload and deploy"** button (top right)
   - Click **"Choose file"**
   - Select `deploy.zip` from your `server` directory
   - Version label: `v1.1-email-service` (or any descriptive name)
   - Click **"Deploy"**

3. **Wait for Deployment** (3-5 minutes)
   - Watch the "Events" tab for progress
   - Status will change from "Updating" to "Ok" when complete

4. **Verify Deployment**
   - Check the health status (should be green)
   - Test the health endpoint: `https://your-backend-url/health`

## Method 2: Using EB CLI (Faster for Future Updates)

### Step 1: Install EB CLI

```bash
# Install using pip (Python package manager)
pip3 install awsebcli --upgrade

# Or using Homebrew (macOS)
brew install awsebcli

# Verify installation
eb --version
```

### Step 2: Initialize EB CLI (One-time setup)

```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server

# Initialize EB CLI (if not already done)
eb init

# When prompted:
# - Select region: us-east-1 (or your region)
# - Select application: clearways-ai-backend (or create new)
# - Select environment: clearways-ai-backend-env (or create new)
```

### Step 3: Deploy

```bash
# Build the application
npm run build

# Deploy to Elastic Beanstalk
eb deploy

# Or deploy to specific environment
eb deploy clearways-ai-backend-env
```

### Step 4: Check Status

```bash
# View environment status
eb status

# View logs
eb logs

# Open in browser
eb open
```

## Method 3: Update Environment Variables (If Needed)

After deploying, you may need to update environment variables for CORS and email:

### Via AWS Console:
1. Go to **Configuration** → **Software**
2. Scroll to **Environment properties**
3. Add/Update:
   ```
   CORS_ORIGIN=https://www.clearways.ai,https://clearways.ai,https://clearways-ai-homepage.netlify.app
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_FROM=noreply@clearways.ai
   APP_NAME=ClearWays AI
   ```
4. Click **Apply**

### Via EB CLI:
```bash
eb setenv \
  CORS_ORIGIN="https://www.clearways.ai,https://clearways.ai,https://clearways-ai-homepage.netlify.app" \
  EMAIL_HOST=smtp.gmail.com \
  EMAIL_PORT=587 \
  EMAIL_SECURE=false \
  EMAIL_USER=your-email@gmail.com \
  EMAIL_PASSWORD=your-app-password \
  EMAIL_FROM=noreply@clearways.ai \
  APP_NAME="ClearWays AI"
```

## Troubleshooting

### Build Fails
- Check that `npm run build` works locally
- Verify all dependencies are in `package.json`
- Check Elastic Beanstalk logs: **Logs** → **Request Logs** → **Last 100 Lines**

### Deployment Succeeds but App Doesn't Work
- Check environment variables are set correctly
- Verify database connection (check RDS security groups)
- Check application logs: **Logs** → **Request Logs**

### CORS Errors After Deployment
- Verify `CORS_ORIGIN` includes your exact frontend URL
- Restart the environment: **Actions** → **Restart app server(s)**

### Email Not Working
- Verify all `EMAIL_*` environment variables are set
- Check server logs for email errors
- Test SMTP credentials manually

## Quick Commands Reference

```bash
# Build
npm run build

# Create ZIP (Console method)
zip -r deploy.zip . -x "node_modules/*" ".git/*" "*.log" ".env" "*.zip"

# Deploy (EB CLI method)
eb deploy

# View logs
eb logs

# SSH into instance
eb ssh

# Check status
eb status
```

