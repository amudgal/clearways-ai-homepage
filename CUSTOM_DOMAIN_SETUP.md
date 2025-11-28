# Custom Domain Setup: www.clearways.ai

This guide provides step-by-step instructions to make your site accessible at **www.clearways.ai**.

## Prerequisites
- Site deployed to Netlify
- Access to DNS provider for `clearways.ai` domain

## Quick Setup Steps

### 1. Add Domain in Netlify

1. Log in to [Netlify Dashboard](https://app.netlify.com)
2. Select your site (or deploy it first if not done)
3. Go to **Site settings** → **Domain management**
4. Click **Add custom domain**
5. Enter: `www.clearways.ai`
6. Click **Verify**

### 2. Configure DNS Records

Netlify will display the DNS records you need to add. For `www.clearways.ai`, you'll typically need:

**CNAME Record:**
```
Type: CNAME
Name: www
Value: [your-site-name].netlify.app
TTL: 3600 (or default)
```

**Steps:**
1. Log in to your DNS provider (e.g., GoDaddy, Namecheap, Cloudflare, etc.)
2. Find DNS management for `clearways.ai`
3. Add the CNAME record as shown above
4. Save changes

### 3. Wait for DNS Propagation

- DNS changes can take 24-48 hours to propagate globally
- Usually completes within 1-4 hours
- You can check propagation status at: https://www.whatsmydns.net/

### 4. SSL Certificate

- Netlify automatically provisions SSL certificates via Let's Encrypt
- Certificate will be issued once DNS is verified (usually within minutes)
- Your site will be accessible at `https://www.clearways.ai`

### 5. Verify Setup

Once DNS propagates:
- Visit `https://www.clearways.ai` - should load your site
- Check SSL certificate is active (green padlock in browser)
- Test all routes to ensure SPA routing works

## Troubleshooting

### Domain not resolving
- Wait longer for DNS propagation (can take up to 48 hours)
- Verify DNS records are correct
- Check DNS provider's propagation status

### SSL certificate not issued
- Ensure DNS is fully propagated
- Check Netlify dashboard for certificate status
- May need to retry certificate provisioning

### Site shows Netlify default page
- Verify the site is deployed successfully
- Check build logs in Netlify dashboard
- Ensure `dist` directory contains built files

## Additional Configuration

### Redirect apex domain (clearways.ai → www.clearways.ai)

If you want `clearways.ai` (without www) to redirect to `www.clearways.ai`:

1. Add `clearways.ai` as a custom domain in Netlify
2. Configure A records (Netlify will provide IPs)
3. Uncomment the redirect rule in `netlify.toml`:

```toml
[[redirects]]
  from = "https://clearways.ai/*"
  to = "https://www.clearways.ai/:splat"
  status = 301
  force = true
```

## Support

- Netlify Docs: https://docs.netlify.com/domains-https/custom-domains/
- Netlify Support: https://www.netlify.com/support/

