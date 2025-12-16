# Quick Deploy Guide

## EB CLI is Now Installed ✅

The `eb` command is now available. Follow these steps to deploy:

## Step 1: Initialize EB CLI (One-time setup)

```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server

# Initialize EB CLI
eb init
```

**When prompted:**
1. **Select a region**: Choose `us-east-1` (or your region)
2. **Select an application**: 
   - If you see `clearways-ai-backend`, select it
   - Otherwise, choose "Create new application"
3. **Application name**: `clearways-ai-backend`
4. **Platform**: Select `Node.js`
5. **Platform version**: Select the latest Node.js version (e.g., Node.js 18)
6. **SSH**: Choose "Yes" if you want SSH access (recommended)

## Step 2: Link to Existing Environment

If your environment already exists:

```bash
# List existing environments
eb list

# Use existing environment
eb use clearways-ai-backend-env
```

If the environment doesn't exist or you want to create a new one:

```bash
# Create new environment
eb create clearways-ai-backend-env
```

## Step 3: Build and Deploy

```bash
# Make sure you're in the server directory
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server

# Build the TypeScript code
npm run build

# Deploy to Elastic Beanstalk
eb deploy
```

## Step 4: Set Environment Variables (If Needed)

After deployment, set the email and CORS variables:

```bash
eb setenv \
  CORS_ORIGIN="https://www.clearways.ai,https://clearways.ai,https://clearways-ai-homepage.netlify.app" \
  EMAIL_HOST=smtp.gmail.com \
  EMAIL_PORT=587 \
  EMAIL_SECURE=false \
  EMAIL_USER=your-email@gmail.com \
  EMAIL_PASSWORD=your-gmail-app-password \
  EMAIL_FROM=noreply@clearways.ai \
  APP_NAME="ClearWays AI"
```

## Useful Commands

```bash
# Check environment status
eb status

# View logs
eb logs

# Open environment in browser
eb open

# SSH into the instance
eb ssh

# Check health
eb health
```

## Troubleshooting

### If `eb init` fails:
- Make sure AWS CLI is configured: `aws configure`
- Check your AWS credentials are valid

### If deployment fails:
- Check the logs: `eb logs`
- Verify all environment variables are set: `eb printenv`
- Make sure the build succeeds locally: `npm run build`

