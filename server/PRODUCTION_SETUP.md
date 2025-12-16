# Production Setup Guide

This guide covers the critical configuration needed for the backend to work in production (Elastic Beanstalk).

## Required Environment Variables

Set these in your Elastic Beanstalk environment configuration:

### 1. Database Configuration
```
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=clearways_ai
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
DB_SSL=true
```

### 2. CORS Configuration (CRITICAL)
```
CORS_ORIGIN=https://www.clearways.ai,https://clearways.ai,https://clearways-ai-homepage.netlify.app
```

**Important:**
- Include ALL frontend URLs (with and without www)
- Use HTTPS, not HTTP
- Separate multiple origins with commas (no spaces after commas)
- This must match exactly or you'll get CORS errors

### 3. JWT Configuration
```
JWT_SECRET=your-very-secure-random-secret-key-minimum-32-characters
JWT_EXPIRES_IN=7d
```

### 4. Email Configuration (REQUIRED for OTP)
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password-or-oauth-token
EMAIL_FROM=noreply@clearways.ai
APP_NAME=ClearWays AI
```

**Email Provider Options:**

#### Option A: Gmail (Recommended for Quick Setup)
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Create a new app password for "Mail"
   - Use this password as `EMAIL_PASSWORD`
3. Set:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password
   ```

#### Option B: AWS SES (Recommended for Production)
1. Verify your domain/email in AWS SES
2. Get SMTP credentials from AWS SES Console
3. Set:
   ```
   EMAIL_HOST=email-smtp.region.amazonaws.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-ses-smtp-username
   EMAIL_PASSWORD=your-ses-smtp-password
   ```

#### Option C: SendGrid
1. Create SendGrid account and get API key
2. Set:
   ```
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=apikey
   EMAIL_PASSWORD=your-sendgrid-api-key
   ```

#### Option D: Other SMTP Providers
Most SMTP providers work with these settings:
- **Host**: Your provider's SMTP server
- **Port**: Usually 587 (TLS) or 465 (SSL)
- **Secure**: `true` for port 465, `false` for port 587
- **User/Password**: Your SMTP credentials

### 5. Node Environment
```
NODE_ENV=production
PORT=8080
```

## Setting Environment Variables in Elastic Beanstalk

### Via AWS Console:
1. Go to Elastic Beanstalk → Your Environment
2. Click **Configuration** → **Software**
3. Scroll to **Environment properties**
4. Add each variable above
5. Click **Apply**

### Via EB CLI:
```bash
eb setenv \
  DB_HOST=your-rds-endpoint \
  DB_PORT=5432 \
  DB_NAME=clearways_ai \
  DB_USER=your_user \
  DB_PASSWORD=your_password \
  DB_SSL=true \
  CORS_ORIGIN=https://www.clearways.ai,https://clearways.ai \
  JWT_SECRET=your-secret \
  JWT_EXPIRES_IN=7d \
  EMAIL_HOST=smtp.gmail.com \
  EMAIL_PORT=587 \
  EMAIL_SECURE=false \
  EMAIL_USER=your-email@gmail.com \
  EMAIL_PASSWORD=your-app-password \
  EMAIL_FROM=noreply@clearways.ai \
  APP_NAME="ClearWays AI" \
  NODE_ENV=production \
  PORT=8080
```

## Troubleshooting

### CORS Errors
**Symptoms:** Browser console shows "CORS policy" errors

**Solutions:**
1. Verify `CORS_ORIGIN` includes your exact frontend URL (with https://)
2. Check that there are no trailing slashes
3. Ensure all variations are included (www and non-www)
4. Restart the Elastic Beanstalk environment after changing CORS_ORIGIN

### OTP Emails Not Sending
**Symptoms:** OTP requests succeed but no email received

**Solutions:**
1. Check server logs for email errors
2. Verify all EMAIL_* environment variables are set
3. Test SMTP credentials manually
4. Check spam folder
5. Verify email provider allows SMTP from your IP (AWS Elastic Beanstalk IP)
6. For Gmail: Ensure you're using an App Password, not your regular password

### Database Connection Errors
**Symptoms:** Health check fails, database queries fail

**Solutions:**
1. Verify RDS security group allows connections from Elastic Beanstalk security group
2. Check DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD are correct
3. Ensure DB_SSL=true for RDS
4. Test connection from Elastic Beanstalk instance

## Testing

After setting up, test the endpoints:

1. **Health Check:**
   ```bash
   curl https://your-backend-url.elasticbeanstalk.com/health
   ```

2. **Send OTP:**
   ```bash
   curl -X POST https://your-backend-url.elasticbeanstalk.com/api/auth/otp/send \
     -H "Content-Type: application/json" \
     -H "Origin: https://www.clearways.ai" \
     -d '{"email":"test@yourdomain.com"}'
   ```

3. **Check Logs:**
   ```bash
   eb logs
   ```

## Security Best Practices

1. **Never commit environment variables** to git
2. **Use AWS Secrets Manager** for sensitive values (JWT_SECRET, DB_PASSWORD, EMAIL_PASSWORD)
3. **Rotate secrets regularly**
4. **Use least privilege** for database and email accounts
5. **Enable HTTPS** on Elastic Beanstalk (configure load balancer with SSL certificate)

