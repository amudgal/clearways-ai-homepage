# Why DKIM Records Must Use CNAME (Not IP Addresses)

## Important: DKIM Records Cannot Use IP Addresses

**You MUST use CNAME records pointing to FQDNs, NOT A records with IP addresses.**

## Why?

1. **DKIM Protocol Requirement**: DKIM (DomainKeys Identified Mail) is a cryptographic email authentication method that requires specific DNS record types. AWS SES uses CNAME records for DKIM.

2. **AWS Infrastructure**: AWS SES uses a distributed infrastructure with multiple servers. The IP addresses can change, but the FQDN (`*.dkim.amazonses.com`) always resolves to the correct servers.

3. **Security**: Using CNAME records allows AWS to rotate servers, update infrastructure, and maintain security without requiring you to update DNS records.

4. **SES Verification**: AWS SES specifically looks for CNAME records with the pattern `{token}._domainkey.{domain}` pointing to `{token}.dkim.amazonses.com`. It will NOT recognize A records with IP addresses.

## What You Need to Add

**You MUST add these as CNAME records:**

1. **Name**: `3eipelaisjj5qfbongczhvmxxvullr4m._domainkey.clearways.ai`
   - **Type**: `CNAME`
   - **Value**: `3eipelaisjj5qfbongczhvmxxvullr4m.dkim.amazonses.com`
   - ❌ **NOT**: An A record with an IP address

2. **Name**: `bt7u7nxvcwanxk6gh3znbbewvea2f3u5._domainkey.clearways.ai`
   - **Type**: `CNAME`
   - **Value**: `bt7u7nxvcwanxk6gh3znbbewvea2f3u5.dkim.amazonses.com`
   - ❌ **NOT**: An A record with an IP address

3. **Name**: `lmy7tl7ecn5dhqpfhdmjsbcpi2af3mtm._domainkey.clearways.ai`
   - **Type**: `CNAME`
   - **Value**: `lmy7tl7ecn5dhqpfhdmjsbcpi2af3mtm.dkim.amazonses.com`
   - ❌ **NOT**: An A record with an IP address

## IP Addresses (For Reference Only)

The IP addresses of `dkim.amazonses.com` are:
- These IPs can change and should NOT be used in DNS records
- They are provided for reference/information only

**Do NOT create A records with these IPs - it will NOT work!**

## If Your DNS Provider Doesn't Support CNAME

If your DNS provider has limitations with CNAME records:

1. **Check DNS Provider Settings**: Most modern DNS providers support CNAME records
2. **Contact Support**: If CNAME is not available, contact your DNS provider
3. **Consider Switching**: If necessary, consider using a DNS provider that supports CNAME (e.g., Route 53, Cloudflare, etc.)

## Summary

- ✅ **Use**: CNAME records pointing to `*.dkim.amazonses.com`
- ❌ **Don't Use**: A records with IP addresses
- 🔍 **Why**: DKIM protocol and AWS SES infrastructure requirements

