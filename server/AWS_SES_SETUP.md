# AWS SES Email Setup Guide

This guide walks you through setting up AWS SES (Simple Email Service) to send OTP emails in production.

## Prerequisites

- AWS Account with access to SES
- Domain ownership (for domain verification)
- Access to AWS Console

---

## Step 1: Access AWS SES Console

1. **Log in to AWS Console**
   - Go to: https://console.aws.amazon.com
   - Sign in with your AWS account

2. **Navigate to SES**
   - In the search bar, type "SES" or "Simple Email Service"
   - Click on **Simple Email Service** (or go directly to: https://console.aws.amazon.com/ses/)

3. **Select Region**
   - **Important**: Choose the same region as your Elastic Beanstalk environment (e.g., `us-east-1`)
   - SES is region-specific, so credentials from one region won't work in another
   - Check the region in the top-right corner of the AWS Console

---

## Step 2: Verify Your Domain or Email Address

You have two options:

### Option A: Verify Domain (Recommended for Production)

This allows you to send emails from any address on your domain (e.g., `noreply@clearways.ai`, `support@clearways.ai`).

1. **In SES Console, go to Verified identities**
   - Click **Verified identities** in the left sidebar
   - Click **Create identity**

2. **Select Domain**
   - Choose **Domain**
   - Enter your domain: `clearways.ai` (without `www`)
   - Click **Create identity**

3. **Add DNS Records**
   - AWS will provide you with DNS records (CNAME records)
   - You need to add these to your domain's DNS settings
   - **Example records** (your actual records will be different):
     ```
     Type: CNAME
     Name: _amazonses.clearways.ai
     Value: [provided-by-aws]
     
     Type: TXT
     Name: clearways.ai
     Value: [provided-by-aws]
     ```

4. **Add DNS Records to Your Domain**
   - Go to your domain registrar (e.g., GoDaddy, Namecheap, Route 53)
   - Navigate to DNS Management / DNS Settings
   - Add the CNAME and TXT records provided by AWS
   - **Note**: DNS propagation can take 24-48 hours, but usually completes within a few hours

5. **Wait for Verification**
   - Return to SES Console
   - The domain status will show as **Pending** initially
   - Once DNS records propagate, it will change to **Verified** (green checkmark)
   - You can click **Refresh** to check status

### Option B: Verify Email Address (Quick Start, Sandbox Mode Only)

**Note**: This only works in SES Sandbox mode. For production, you must verify a domain.

1. **In SES Console, go to Verified identities**
   - Click **Create identity**
   - Choose **Email address**
   - Enter: `noreply@clearways.ai` (or your preferred email)
   - Click **Create identity**

2. **Check Your Email**
   - AWS will send a verification email
   - Click the verification link in the email
   - The email address will show as **Verified**

---

## Step 3: Request Production Access (If in Sandbox Mode)

**Important**: By default, SES starts in "Sandbox" mode, which only allows sending to verified email addresses.

1. **Check Your Account Status**
   - In SES Console, look at the top banner
   - If you see "Your account is in the Amazon SES sandbox", you need to request production access

2. **Request Production Access**
   - Click **Request production access** in the banner
   - Or go to: **Account dashboard** → **Request production access**
   - Fill out the form:
     - **Mail Type**: Transactional
     - **Website URL**: https://clearways.ai
     - **Use case description**: 
       ```
       We use AWS SES to send one-time password (OTP) emails for user authentication 
       on our TCO analysis platform. Users receive OTP codes via email to log in 
       to the system.
       ```
     - **Expected sending volume**: Estimate your monthly emails (e.g., 10,000)
     - **How you plan to handle bounces and complaints**: 
       ```
       We will monitor bounce and complaint rates through AWS CloudWatch and SES 
       metrics. We have implemented proper email validation and only send to 
       corporate email addresses.
       ```
   - Click **Submit request**
   - **Note**: Approval usually takes 24-48 hours

---

## Step 4: Create SMTP Credentials

1. **Navigate to SMTP Settings**
   - In SES Console, click **SMTP settings** in the left sidebar
   - Or go to: https://console.aws.amazon.com/ses/home?region=us-east-1#/smtp

2. **Create SMTP Credentials**
   - Click **Create SMTP credentials**
   - **IAM User Name**: Enter a name (e.g., `clearways-ses-smtp-user`)
   - Click **Create**

3. **Download Credentials**
   - **IMPORTANT**: AWS will show your SMTP credentials **only once**
   - Click **Download Credentials** to save them
   - Or copy them immediately:
     - **SMTP Username**: (starts with `AKIA...`)
     - **SMTP Password**: (long random string)
   - **Save these securely** - you cannot retrieve the password later!

4. **Note the SMTP Server Details**
   - **SMTP Server Name**: `email-smtp.us-east-1.amazonaws.com` (or your region)
   - **Port**: `587` (TLS) or `465` (SSL)
   - **Region**: Note which region you're using (must match your Elastic Beanstalk region)

---

## Step 5: Configure Environment Variables in Elastic Beanstalk

1. **Go to Elastic Beanstalk Console**
   - Navigate to: https://console.aws.amazon.com/elasticbeanstalk/home?region=us-east-1
   - Click on your environment: `clearways-ai-backend-env`

2. **Open Configuration**
   - Click **Configuration** in the left sidebar
   - Scroll down and click **Edit** next to **Software**

3. **Add Environment Variables**
   - Scroll to **Environment properties**
   - Click **Add more** and add the following variables:

   ```
   EMAIL_HOST = email-smtp.us-east-1.amazonaws.com
   EMAIL_PORT = 587
   EMAIL_SECURE = false
   EMAIL_USER = [Your SMTP Username from Step 4]
   EMAIL_PASSWORD = [Your SMTP Password from Step 4]
   EMAIL_FROM = noreply@clearways.ai
   ```

   **Important Notes**:
   - Replace `[Your SMTP Username]` with the actual SMTP username (starts with `AKIA...`)
   - Replace `[Your SMTP Password]` with the actual SMTP password
   - `EMAIL_HOST` should match your SES region (e.g., `email-smtp.us-east-1.amazonaws.com` for us-east-1)
   - `EMAIL_PORT`: Use `587` for TLS or `465` for SSL
   - `EMAIL_SECURE`: `false` for port 587 (TLS), `true` for port 465 (SSL)
   - `EMAIL_FROM`: Use a verified email address or domain (e.g., `noreply@clearways.ai`)

4. **Save Configuration**
   - Click **Apply** at the bottom
   - **Note**: This will restart your Elastic Beanstalk environment (takes 2-5 minutes)

---

## Step 6: Verify Email Configuration

1. **Wait for Environment Restart**
   - Monitor the Elastic Beanstalk environment status
   - Wait until it shows **Ready** (green)

2. **Test Email Sending**
   - Try logging in to your application at https://clearways.ai
   - Enter a verified email address
   - Check if you receive the OTP email

3. **Check Logs (If Email Not Received)**
   - In Elastic Beanstalk Console, go to **Logs**
   - Click **Request Logs** → **Last 100 Lines**
   - Look for email-related errors or success messages

---

## Troubleshooting

### Email Not Received

1. **Check SES Sending Statistics**
   - Go to SES Console → **Sending statistics**
   - Check if emails are being sent and if there are bounces/complaints

2. **Check SES Account Status**
   - Ensure you're out of Sandbox mode (if sending to unverified addresses)
   - Verify your domain/email is still verified

3. **Check Environment Variables**
   - Verify all `EMAIL_*` variables are set correctly in Elastic Beanstalk
   - Ensure no typos in SMTP username/password

4. **Check Application Logs**
   - Look for email service errors in Elastic Beanstalk logs
   - Common errors:
     - `Invalid login credentials` → Check SMTP username/password
     - `Connection timeout` → Check EMAIL_HOST and region
     - `Domain not verified` → Verify domain in SES

### Common Issues

**Issue**: "Invalid login credentials"
- **Solution**: Double-check SMTP username and password. They are case-sensitive.

**Issue**: "Connection timeout"
- **Solution**: Ensure `EMAIL_HOST` matches your SES region and `EMAIL_PORT` is correct (587 or 465).

**Issue**: "Domain not verified"
- **Solution**: Verify your domain in SES Console and ensure DNS records are correct.

**Issue**: "Account is in sandbox"
- **Solution**: Request production access in SES Console and wait for approval.

---

## Security Best Practices

1. **Rotate SMTP Credentials Regularly**
   - Create new SMTP credentials periodically
   - Update environment variables in Elastic Beanstalk

2. **Use IAM Policies**
   - Restrict SMTP user to only send emails (not manage SES)

3. **Monitor Sending Statistics**
   - Set up CloudWatch alarms for bounce/complaint rates
   - Keep bounce rate below 5% and complaint rate below 0.1%

4. **Use Verified Domains**
   - Always verify your domain (not just email addresses)
   - This allows sending from any address on your domain

---

## Quick Reference: Environment Variables

```bash
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=AKIAIOSFODNN7EXAMPLE
EMAIL_PASSWORD=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
EMAIL_FROM=noreply@clearways.ai
```

**Replace with your actual values!**

---

## Next Steps

After completing this setup:

1. ✅ Test OTP email delivery
2. ✅ Monitor SES sending statistics
3. ✅ Set up CloudWatch alarms for email metrics
4. ✅ Document SMTP credentials securely (password manager)

---

## Support

If you encounter issues:
- Check AWS SES documentation: https://docs.aws.amazon.com/ses/
- Check Elastic Beanstalk logs for error messages
- Verify all environment variables are set correctly

