# Check and Fix Email Configuration for OTP

## Current Issue

The backend is returning a 500 error: "Failed to send OTP email. Please try again or contact support."

This means:
- ✅ The API is working (no certificate errors)
- ✅ The request is reaching the backend
- ❌ The email service is failing to send emails

## Step 1: Check Backend Logs

Check the Elastic Beanstalk logs to see the actual error:

```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server

# Option 1: Use EB CLI (if configured)
eb logs

# Option 2: Use AWS Console
# Go to: AWS Console → Elastic Beanstalk → clearways-ai-backend-env → Logs → Request logs
```

Look for errors like:
- `[Email Service] Failed to send OTP email: ...`
- Connection errors
- Authentication errors
- SMTP errors

## Step 2: Verify Email Environment Variables

Check if email environment variables are set in Elastic Beanstalk:

```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server

# Check current environment variables
eb printenv

# Or via AWS Console:
# Elastic Beanstalk → Configuration → Software → Environment properties
```

**Required variables:**
- `EMAIL_HOST` - SMTP server (e.g., `smtp.gmail.com` or `email-smtp.us-east-1.amazonaws.com`)
- `EMAIL_PORT` - Port (usually `587` for TLS or `465` for SSL)
- `EMAIL_USER` - SMTP username
- `EMAIL_PASSWORD` - SMTP password
- `EMAIL_SECURE` - `false` for port 587, `true` for port 465
- `EMAIL_FROM` - Sender email (e.g., `noreply@clearways.ai`)

## Step 3: Configure Email Service

### Option A: Gmail (Easiest for Testing)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "ClearWays AI" as name
   - Copy the 16-character password

3. **Set Environment Variables**:
```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server

eb setenv \
  EMAIL_HOST=smtp.gmail.com \
  EMAIL_PORT=587 \
  EMAIL_SECURE=false \
  EMAIL_USER=your-email@gmail.com \
  EMAIL_PASSWORD=your-16-char-app-password \
  EMAIL_FROM=noreply@clearways.ai
```

### Option B: AWS SES (Recommended for Production)

1. **Set up AWS SES** (see `AWS_SES_SETUP.md` for details)
2. **Get SMTP credentials** from AWS SES Console
3. **Set Environment Variables**:
```bash
eb setenv \
  EMAIL_HOST=email-smtp.us-east-1.amazonaws.com \
  EMAIL_PORT=587 \
  EMAIL_SECURE=false \
  EMAIL_USER=your-ses-smtp-username \
  EMAIL_PASSWORD=your-ses-smtp-password \
  EMAIL_FROM=noreply@clearways.ai
```

**Important**: Make sure the `EMAIL_FROM` email/domain is verified in AWS SES!

## Step 4: Verify Configuration

After setting environment variables, wait for the environment to update (5-10 minutes), then test:

1. **Check logs** to see if email service initializes correctly
2. **Try sending OTP** from the frontend
3. **Check logs** for any email errors

## Step 5: Common Issues and Fixes

### Issue 1: "Connection timeout"

**Cause**: Wrong EMAIL_HOST or network issue

**Fix**:
- Verify EMAIL_HOST is correct
- For AWS SES, use: `email-smtp.us-east-1.amazonaws.com` (or your region)
- For Gmail, use: `smtp.gmail.com`
- Check security groups allow outbound SMTP (port 587 or 465)

### Issue 2: "Authentication failed"

**Cause**: Wrong EMAIL_USER or EMAIL_PASSWORD

**Fix**:
- For Gmail: Use App Password (not regular password)
- For AWS SES: Use SMTP credentials (not AWS access keys)
- Verify credentials are correct (no extra spaces)

### Issue 3: "Sender address not verified" (AWS SES)

**Cause**: EMAIL_FROM address/domain not verified in SES

**Fix**:
1. Go to AWS SES Console → Verified identities
2. Verify the email address or domain
3. Wait for verification to complete
4. Update EMAIL_FROM to use verified address

### Issue 4: "Rate limit exceeded" (AWS SES)

**Cause**: SES account is in sandbox mode

**Fix**:
1. Request production access in AWS SES Console
2. Or use Gmail for testing (has higher limits)

## Quick Test

After configuring, test the email service:

```bash
# Check if email is configured (should return true if all vars are set)
# This is checked in the code, but you can verify by checking logs
```

Then try sending OTP from the frontend and check:
- ✅ Backend logs show: `[Email Service] OTP email sent to ...`
- ✅ Email is received
- ✅ No 500 errors

## Temporary Workaround (Development Only)

If you need to test without email configuration, the code will return the OTP in the response in development mode. However, in production, it requires email to be configured.

For production, you **must** configure the email service properly.

