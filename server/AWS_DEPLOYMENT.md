# AWS Backend Deployment Guide

This guide will help you deploy the ClearWays AI backend to AWS using Elastic Beanstalk (recommended) or EC2.

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI installed and configured (`aws configure`)
3. AWS RDS PostgreSQL database already set up (you mentioned you have credentials)
4. Node.js 18+ installed locally (for building)

## Option 1: AWS Elastic Beanstalk (Recommended - Easiest)

### Step 1: Install EB CLI

```bash
pip install awsebcli --upgrade
```

### Step 2: Initialize Elastic Beanstalk

```bash
cd server
eb init -p node.js -r us-east-1 clearways-ai-backend
```

When prompted:
- Select a region (e.g., `us-east-1`)
- Choose "Create new application"
- Application name: `clearways-ai-backend`

### Step 3: Create Environment

```bash
eb create clearways-ai-backend-env
```

This will:
- Create an EC2 instance
- Set up load balancer
- Configure security groups
- Deploy your application

### Step 4: Configure Environment Variables

After the environment is created, set environment variables:

```bash
eb setenv \
  DB_HOST=cleartrails-dev-db.cqzmmee6i8lc.us-east-1.rds.amazonaws.com \
  DB_PORT=5432 \
  DB_NAME=cleartrails_dev \
  DB_USER=cleartrails_admin \
  DB_PASSWORD=DCs1QiM5bBCZ6WJENpR4YBjFi \
  DB_SSL=true \
  JWT_SECRET=your-super-secret-jwt-key-change-this \
  CORS_ORIGIN=https://your-netlify-site.netlify.app \
  NODE_ENV=production \
  PORT=8080
```

**Important**: Replace:
- `JWT_SECRET` with a strong random string
- `CORS_ORIGIN` with your actual Netlify site URL

### Step 5: Run Database Migration

SSH into the instance and run migration:

```bash
eb ssh
cd /var/app/current
npm run migrate
exit
```

### Step 6: Get Your Backend URL

```bash
eb status
```

Look for the "CNAME" value - this is your backend URL (e.g., `clearways-ai-backend-env.eba-xxxxx.us-east-1.elasticbeanstalk.com`)

Your API will be available at: `http://clearways-ai-backend-env.eba-xxxxx.us-east-1.elasticbeanstalk.com/api`

### Step 7: Update Netlify Environment Variable

In Netlify Dashboard:
1. Go to Site settings → Environment variables
2. Add `VITE_API_URL` = `http://clearways-ai-backend-env.eba-xxxxx.us-east-1.elasticbeanstalk.com/api`
3. Redeploy your frontend

### Step 8: Configure HTTPS (Optional but Recommended)

1. Go to AWS Console → Elastic Beanstalk → Your Environment → Configuration
2. Under "Load balancer", add a listener for HTTPS (port 443)
3. Upload or create an SSL certificate in AWS Certificate Manager
4. Update `VITE_API_URL` in Netlify to use `https://` instead of `http://`

## Option 2: AWS EC2 (More Control)

### Step 1: Launch EC2 Instance

1. Go to AWS Console → EC2 → Launch Instance
2. Choose:
   - **AMI**: Amazon Linux 2023 or Ubuntu 22.04 LTS
   - **Instance Type**: t3.small or t3.medium (minimum)
   - **Key Pair**: Create or select an existing key pair
   - **Security Group**: Create new with rules:
     - SSH (22) from your IP
     - HTTP (80) from anywhere
     - HTTPS (443) from anywhere
     - Custom TCP (3001) from anywhere (or just your Netlify IP)
3. Launch instance

### Step 2: Connect to EC2 Instance

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

### Step 3: Install Node.js and Dependencies

For Amazon Linux:
```bash
sudo yum update -y
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

For Ubuntu:
```bash
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 4: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### Step 5: Clone and Setup Application

```bash
cd /home/ec2-user
git clone https://github.com/amudgal/clearways-ai-homepage.git
cd clearways-ai-homepage/server
npm install
npm run build
```

### Step 6: Create Environment File

```bash
nano .env
```

Add:
```env
DB_HOST=cleartrails-dev-db.cqzmmee6i8lc.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=cleartrails_dev
DB_USER=cleartrails_admin
DB_PASSWORD=DCs1QiM5bBCZ6WJENpR4YBjFi
DB_SSL=true
JWT_SECRET=your-super-secret-jwt-key-change-this
CORS_ORIGIN=https://your-netlify-site.netlify.app
NODE_ENV=production
PORT=3001
```

### Step 7: Run Database Migration

```bash
npm run migrate
```

### Step 8: Start Application with PM2

```bash
pm2 start dist/index.js --name clearways-backend
pm2 save
pm2 startup
```

### Step 9: Configure Nginx (Reverse Proxy)

```bash
sudo yum install nginx -y  # Amazon Linux
# OR
sudo apt install nginx -y  # Ubuntu
```

Create Nginx config:
```bash
sudo nano /etc/nginx/conf.d/clearways-backend.conf
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Start Nginx:
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 10: Get Your Backend URL

Your backend will be available at: `http://your-ec2-public-ip/api`

Or if you set up a domain: `http://your-domain.com/api`

## Security Group Configuration

Ensure your RDS security group allows connections from your EC2/Elastic Beanstalk security group:

1. Go to AWS Console → RDS → Your Database → Connectivity & security
2. Click on the VPC security group
3. Edit inbound rules
4. Add rule:
   - Type: PostgreSQL
   - Source: Select your EC2/EB security group

## Troubleshooting

### Check Application Logs

**Elastic Beanstalk:**
```bash
eb logs
```

**EC2 with PM2:**
```bash
pm2 logs clearways-backend
```

### Test Health Endpoint

```bash
curl http://your-backend-url/health
```

Should return:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "..."
}
```

### Common Issues

1. **Database Connection Failed**: Check security group rules and RDS endpoint
2. **CORS Errors**: Verify `CORS_ORIGIN` matches your frontend URL exactly
3. **Port Issues**: Ensure security group allows traffic on the correct port
4. **Build Failures**: Check Node.js version (needs 18+)

## Next Steps

1. Set up a custom domain (optional)
2. Configure SSL certificate for HTTPS
3. Set up monitoring and alerts
4. Configure auto-scaling (if needed)
5. Set up CI/CD for automatic deployments

