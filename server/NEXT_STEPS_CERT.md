# Next Steps: Certificate Requested Successfully ✅

## Certificate Details

- **Domain**: `api.clearways.ai`
- **Certificate ARN**: `arn:aws:acm:us-east-1:194893387380:certificate/aa0de9b8-d11b-4191-a65c-1eabd15c53c3`
- **Status**: PENDING_VALIDATION (will be ISSUED after DNS validation)

## Step 1: Add DNS Validation Record

Add this CNAME record to your DNS provider (where `clearways.ai` is hosted):

**Record to Add:**
- **Type**: CNAME
- **Name**: `_27ce3527ae120a3110267b9c8ca81674.api.clearways.ai`
- **Value**: `_f34709774c583e5ec38edb9be0af364c.jkddzztszm.acm-validations.aws.`
- **TTL**: 300 (or default)

**Where to add it:**
- If using Route 53: AWS Console → Route 53 → Hosted Zones → clearways.ai
- If using other DNS provider: Add the CNAME record in their DNS management interface

## Step 2: Point Custom Domain to Elastic Beanstalk

Add another CNAME record to point `api.clearways.ai` to your Elastic Beanstalk:

**Record to Add:**
- **Type**: CNAME
- **Name**: `api` (or `api.clearways.ai` depending on your DNS provider)
- **Value**: `clearways-ai-backend-env.eba-skxjjmed.us-east-1.elasticbeanstalk.com`
- **TTL**: 300 (or default)

## Step 3: Check Certificate Status

After adding DNS records, wait 5-30 minutes for validation, then check:

```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server
./check-cert-status.sh
```

Or manually:
```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:194893387380:certificate/aa0de9b8-d11b-4191-a65c-1eabd15c53c3 \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text
```

Wait until status is **ISSUED**.

## Step 4: Configure HTTPS Listener in Elastic Beanstalk

Once certificate is ISSUED:

1. Go to **AWS Console** → **Elastic Beanstalk**
2. Select environment: `clearways-ai-backend-env`
3. Click **Configuration** → **Load balancer**
4. Click **Modify**
5. Under **Listeners**, you should see HTTP (port 80)
6. Click **Add listener**:
   - **Port**: 443
   - **Protocol**: HTTPS
   - **SSL certificate**: Select `api.clearways.ai` (or paste the ARN)
7. Click **Apply**
8. **Wait 5-10 minutes** for environment to update

## Step 5: Test HTTPS

After configuration completes:

```bash
# Test custom domain
curl https://api.clearways.ai/health

# Should return 200 OK with JSON response
```

## Step 6: Update Netlify Environment Variable

1. Go to **Netlify Dashboard** → Your Site → **Site settings** → **Environment variables**
2. Update `VITE_API_URL` to:
   ```
   https://api.clearways.ai/api
   ```
3. Click **Save**
4. **Trigger new deployment**: **Deploys** tab → **Trigger deploy** → **Deploy site**

## Step 7: Update CORS in Elastic Beanstalk

Make sure CORS includes your frontend URLs:

```bash
cd /Users/amitmudgal/Documents/ClearWaysAI/code/server

eb setenv CORS_ORIGIN="https://www.clearways.ai,https://clearways.ai,https://clearways-ai-homepage.netlify.app,https://api.clearways.ai"
```

Or via console:
- Elastic Beanstalk → Configuration → Software → Environment properties
- Update `CORS_ORIGIN` to include all your frontend URLs

## Step 8: Test OTP Flow

1. Go to `https://www.clearways.ai/login`
2. Enter corporate email
3. OTP should be sent successfully
4. Check email for OTP code

## Quick Checklist

- [ ] Add DNS validation CNAME record
- [ ] Add CNAME record pointing api.clearways.ai to Elastic Beanstalk
- [ ] Wait for certificate status = ISSUED (check with `./check-cert-status.sh`)
- [ ] Configure HTTPS listener in Elastic Beanstalk
- [ ] Test `https://api.clearways.ai/health`
- [ ] Update Netlify `VITE_API_URL` to `https://api.clearways.ai/api`
- [ ] Update CORS_ORIGIN in Elastic Beanstalk
- [ ] Test OTP flow from frontend

## Troubleshooting

### Certificate Status Stays PENDING_VALIDATION
- Verify DNS validation record was added correctly
- Check DNS propagation: `dig CNAME _27ce3527ae120a3110267b9c8ca81674.api.clearways.ai`
- Wait longer (can take up to 30 minutes)

### HTTPS Still Times Out
- Verify HTTPS listener is configured (port 443)
- Check environment update completed
- Verify security groups allow port 443

### Custom Domain Not Resolving
- Verify CNAME record for `api.clearways.ai` is correct
- Check DNS propagation: `dig CNAME api.clearways.ai`
- Wait for DNS propagation (5-30 minutes)

## Timeline

- **DNS Records**: 5 minutes to add
- **Certificate Validation**: 5-30 minutes
- **Elastic Beanstalk Update**: 5-10 minutes
- **DNS Propagation**: 5-30 minutes
- **Total**: ~30-60 minutes


