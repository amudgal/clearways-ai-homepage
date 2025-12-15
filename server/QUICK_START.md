# Quick Start: Deploy Backend to AWS

## Prerequisites

1. **AWS Account** with permissions to create EC2, Elastic Beanstalk, and RDS resources
2. **AWS CLI** installed and configured:
   ```bash
   aws configure
   ```
   Enter your AWS Access Key ID, Secret Access Key, region (e.g., `us-east-1`), and output format (`json`)

3. **Python 3** (for EB CLI):
   ```bash
   python3 --version
   ```

## Fastest Deployment Method (5-10 minutes)

### Step 1: Install EB CLI

```bash
pip3 install awsebcli --upgrade
```

### Step 2: Navigate to Server Directory

```bash
cd server
```

### Step 3: Run Deployment Script

```bash
./deploy.sh
```

The script will:
- Initialize Elastic Beanstalk (if needed)
- Build your application
- Create or update the environment
- Set environment variables
- Provide you with the backend URL

### Step 4: Run Database Migration

After deployment, SSH into the instance:

```bash
eb ssh
cd /var/app/current
npm run migrate
exit
```

### Step 5: Get Your Backend URL

```bash
eb status
```

Look for the **CNAME** - your API will be at: `http://[CNAME]/api`

### Step 6: Update Netlify

1. Go to Netlify Dashboard → Your Site → Site settings → Environment variables
2. Add: `VITE_API_URL` = `http://[your-cname]/api`
3. Redeploy your frontend

## Manual Deployment (Alternative)

If the script doesn't work, follow the detailed guide in `AWS_DEPLOYMENT.md`.

## Troubleshooting

### EB CLI not found
```bash
pip3 install --user awsebcli
export PATH=$PATH:~/.local/bin
```

### Permission denied
```bash
chmod +x deploy.sh
```

### Build fails
Make sure you're in the `server` directory and have run `npm install` first.

## Security Notes

⚠️ **Important**: The deployment script uses your RDS credentials. In production:
- Use AWS Secrets Manager or Parameter Store for sensitive values
- Rotate JWT secrets regularly
- Use HTTPS (configure SSL certificate in Elastic Beanstalk)

## Next Steps After Deployment

1. ✅ Test health endpoint: `curl http://[your-url]/health`
2. ✅ Configure HTTPS (recommended)
3. ✅ Set up monitoring and alerts
4. ✅ Configure auto-scaling if needed

