# Deploy Backend to AWS via Console (No EB CLI Required)

This guide uses the AWS Console directly - no command-line tools needed!

## Step 1: Prepare Deployment Package

1. Navigate to server directory:
```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server
```

2. Build the application:
```bash
npm install
npm run build
```

3. Create a ZIP file with the deployment:
```bash
zip -r deploy.zip . -x "node_modules/*" ".git/*" "*.log" ".env"
```

This creates `deploy.zip` with your built application.

## Step 2: Deploy via AWS Console

### Option A: Elastic Beanstalk (Easiest)

1. **Go to AWS Console** → **Elastic Beanstalk**
   - https://console.aws.amazon.com/elasticbeanstalk/

2. **Create Application**:
   - Click "Create Application"
   - Application name: `clearways-ai-backend`
   - Description: `Backend API for ClearWays AI`

3. **Create Environment**:
   - Platform: **Node.js**
   - Platform branch: **Node.js 18 running on 64bit Amazon Linux 2**
   - Application code: **Upload your code**
   - Click "Choose file" and upload `deploy.zip`
   - Environment name: `clearways-ai-backend-env`
   - Domain: Leave default (or customize)
   - Click "Create environment"

4. **Wait for Deployment** (5-10 minutes)

5. **Configure Environment Variables**:
   - Once deployed, go to **Configuration** → **Software**
   - Scroll to "Environment properties"
   - Add these variables:
     ```
     DB_HOST=cleartrails-dev-db.cqzmmee6i8lc.us-east-1.rds.amazonaws.com
     DB_PORT=5432
     DB_NAME=cleartrails_dev
     DB_USER=cleartrails_admin
     DB_PASSWORD=DCs1QiM5bBCZ6WJENpR4YBjFi
     DB_SSL=true
     JWT_SECRET=your-strong-random-secret-key-here
     CORS_ORIGIN=https://your-netlify-site.netlify.app
     NODE_ENV=production
     PORT=8080
     ```
   - Click "Apply"

6. **Get Your Backend URL**:
   - Go to the environment overview
   - Find the **URL** (e.g., `clearways-ai-backend-env.eba-xxxxx.us-east-1.elasticbeanstalk.com`)
   - Your API will be at: `http://[URL]/api`

7. **Run Database Migration**:
   - Go to **Configuration** → **Security**
   - Click "Modify" on the EC2 instance profile
   - Note the security group name
   - Go to **EC2 Console** → **Instances**
   - Find your Elastic Beanstalk instance
   - Click "Connect" → "Session Manager" (or use SSH)
   - Run:
     ```bash
     cd /var/app/current
     npm install
     npm run migrate
     ```

### Option B: EC2 Instance (More Control)

1. **Launch EC2 Instance**:
   - Go to **EC2 Console** → **Launch Instance**
   - Name: `clearways-ai-backend`
   - AMI: **Amazon Linux 2023** or **Ubuntu 22.04**
   - Instance type: **t3.small** (minimum)
   - Key pair: Create or select existing
   - Security group: Create new with:
     - SSH (22) from your IP
     - HTTP (80) from anywhere
     - HTTPS (443) from anywhere
     - Custom TCP (3001) from anywhere
   - Launch instance

2. **Connect to Instance**:
   - Select instance → **Connect** → **EC2 Instance Connect** (or use SSH)

3. **Install Node.js**:
   ```bash
   # For Amazon Linux:
   sudo yum update -y
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 18
   nvm use 18
   
   # For Ubuntu:
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Upload and Setup Application**:
   - In EC2 Console, select instance → **Actions** → **Security** → **Get Windows password** (or use SCP)
   - Or use AWS Systems Manager Session Manager
   - Upload `deploy.zip` to `/home/ec2-user/`
   - Extract:
     ```bash
     cd /home/ec2-user
     unzip deploy.zip -d clearways-backend
     cd clearways-backend
     npm install --production
     ```

5. **Create .env file**:
   ```bash
   nano .env
   ```
   Add the same environment variables as above

6. **Run Migration**:
   ```bash
   npm run migrate
   ```

7. **Install PM2 and Start**:
   ```bash
   sudo npm install -g pm2
   npm run build
   pm2 start dist/index.js --name clearways-backend
   pm2 save
   pm2 startup
   ```

8. **Get Public IP**:
   - In EC2 Console, your instance's public IP is your backend URL
   - API: `http://[PUBLIC-IP]/api`

## Step 3: Configure RDS Security Group

1. Go to **RDS Console** → Your database → **Connectivity & security**
2. Click on the **VPC security group**
3. **Edit inbound rules**
4. Add rule:
   - Type: **PostgreSQL**
   - Source: Select your EC2/Elastic Beanstalk security group
   - Save

## Step 4: Update Netlify

1. Go to **Netlify Dashboard** → Your site → **Site settings** → **Environment variables**
2. Add: `VITE_API_URL` = `http://[your-backend-url]/api`
3. **Redeploy** your frontend

## Step 5: Test

```bash
curl http://[your-backend-url]/health
```

Should return:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "..."
}
```

## Troubleshooting

- **Can't connect to database**: Check RDS security group allows your EC2/EB security group
- **CORS errors**: Verify `CORS_ORIGIN` matches your Netlify URL exactly
- **Application not starting**: Check logs in Elastic Beanstalk or `pm2 logs` on EC2

