# Verify Email in AWS SES via CLI

## ✅ Verification Request Sent

I've sent a verification request for `noreply@clearways.ai` via AWS CLI.

## Next Steps

### Option 1: Verify Email Address (Current)

**If you have access to `noreply@clearways.ai` inbox:**

1. **Check the email inbox** for `noreply@clearways.ai`
2. **Look for email from AWS SES** (subject: "Amazon SES Address Verification Request")
3. **Click the verification link** in the email
4. **Or copy the verification token** and use:
   ```bash
   aws sesv2 put-email-identity-verification-attributes \
     --email-identity noreply@clearways.ai \
     --verification-attributes VerificationToken=YOUR_TOKEN \
     --region us-east-1
   ```

**Check verification status:**
```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server
./check-ses-status.sh noreply@clearways.ai
```

### Option 2: Verify Domain (Recommended - Better Solution)

**If you don't have access to `noreply@clearways.ai` inbox, verify the domain instead:**

This allows you to send from ANY email address on `clearways.ai`:

```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server
./verify-domain-ses.sh clearways.ai
```

This will:
1. Create domain verification request
2. Show you DNS records to add
3. Add those DNS records to your DNS provider
4. Wait for DNS propagation (5-30 minutes)
5. Domain will be automatically verified

**Benefits:**
- ✅ Can send from any email on the domain (noreply@, support@, etc.)
- ✅ More professional
- ✅ No need to verify each email individually

## Check Verification Status

```bash
# Check email status
./check-ses-status.sh noreply@clearways.ai

# Check domain status
./check-ses-status.sh clearways.ai
```

## After Verification

Once verified:

1. **Wait 2-3 minutes** for SES to recognize the verification
2. **Test OTP** from the frontend
3. **Check logs** - should see:
   ```
   [Email Service] OTP email sent to ...
   ```
4. **Check email inbox** - OTP should be received

## Troubleshooting

### "Identity not found"
- Run the verification script again:
  ```bash
  ./verify-email-ses.sh noreply@clearways.ai
  ```

### "Verification pending"
- Check email inbox for verification link
- Or wait for DNS propagation (if verifying domain)

### "Still getting 554 error after verification"
- Wait 5-10 minutes for SES to propagate
- Verify the `EMAIL_FROM` environment variable matches exactly
- Check you're using the correct AWS region (us-east-1)

## Quick Commands Reference

```bash
# Verify email address
./verify-email-ses.sh noreply@clearways.ai

# Verify domain
./verify-domain-ses.sh clearways.ai

# Check status
./check-ses-status.sh noreply@clearways.ai
./check-ses-status.sh clearways.ai

# Manual check via AWS CLI
aws sesv2 get-email-identity --email-identity noreply@clearways.ai --region us-east-1
```

