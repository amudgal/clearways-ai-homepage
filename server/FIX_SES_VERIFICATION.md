# Fix AWS SES Email Verification Issue

## Problem

The error in the logs shows:
```
554 Message rejected: Email address is not verified. The following identities failed the check in region US-EAST-1: noreply@clearways.ai
```

This means AWS SES is rejecting emails because the sender address `noreply@clearways.ai` is not verified.

## Solution: Verify Email Address or Domain in AWS SES

### Option 1: Verify Email Address (Quick Fix)

1. **Go to AWS SES Console**:
   - https://console.aws.amazon.com/ses/
   - Make sure you're in the **US East (N. Virginia)** region (us-east-1)

2. **Click "Verified identities"** in the left sidebar

3. **Click "Create identity"**

4. **Select "Email address"**

5. **Enter email address**: `noreply@clearways.ai`

6. **Click "Create identity"**

7. **Check your email inbox** for `noreply@clearways.ai`
   - You'll receive a verification email from AWS
   - Click the verification link in the email
   - Or copy the verification token and enter it in the SES console

8. **Wait for verification** (usually instant after clicking the link)

9. **Verify status shows "Verified"** in the SES console

### Option 2: Verify Domain (Recommended for Production)

If you want to send from any email address on `clearways.ai`:

1. **Go to AWS SES Console** → **Verified identities**

2. **Click "Create identity"**

3. **Select "Domain"**

4. **Enter domain**: `clearways.ai`

5. **Click "Create identity"**

6. **Add DNS records** to your DNS provider:
   - SES will show you DNS records to add (CNAME records)
   - Add these records to your DNS provider (where `clearways.ai` is hosted)
   - Wait for DNS propagation (5-30 minutes)

7. **Verify status shows "Verified"** in the SES console

**Benefits of domain verification:**
- Can send from any email address on the domain (e.g., `noreply@clearways.ai`, `support@clearways.ai`, etc.)
- More professional and scalable
- No need to verify each email address individually

### Option 3: Use a Verified Email Address

If you already have a verified email address in SES:

1. **Check verified identities** in SES console
2. **Update `EMAIL_FROM`** environment variable to use a verified email:
```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server

eb setenv EMAIL_FROM=your-verified-email@clearways.ai
```

## After Verification

Once the email address or domain is verified:

1. **Wait a few minutes** for SES to recognize the verification

2. **Test OTP again** from the frontend

3. **Check logs** - should see:
   ```
   [Email Service] OTP email sent to ...
   ```

4. **Check email inbox** - OTP should be received

## Verify Current Configuration

Check what email is configured:

```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server

eb printenv | grep EMAIL
```

You should see:
- `EMAIL_FROM=noreply@clearways.ai` (or similar)

Make sure this matches the verified email/domain in SES.

## Quick Test

After verification, you can test by:

1. **Sending OTP** from the frontend
2. **Checking backend logs**:
   ```bash
   eb logs --all | grep -i "email\|otp" | tail -20
   ```
3. **Checking email inbox** for the OTP

## Common Issues

### Issue: "Still getting verification error after verifying"

**Solutions:**
- Wait 5-10 minutes for SES to propagate the verification
- Make sure you're in the correct AWS region (us-east-1)
- Verify the `EMAIL_FROM` environment variable matches the verified email exactly

### Issue: "Domain verification taking too long"

**Solutions:**
- Check DNS records are added correctly
- Wait for DNS propagation (can take up to 48 hours, usually 5-30 minutes)
- Verify DNS records using: `dig TXT _amazonses.clearways.ai`

### Issue: "SES account in sandbox mode"

If you see "Email address not verified" even after verification, your SES account might be in sandbox mode, which only allows sending to verified email addresses.

**Solution:**
1. Request production access in SES Console
2. Fill out the request form
3. Wait for AWS approval (usually 24-48 hours)

## Expected Result

After verification:
- ✅ SES console shows email/domain as "Verified"
- ✅ OTP emails are sent successfully
- ✅ No more "554 Message rejected" errors
- ✅ Users receive OTP emails

