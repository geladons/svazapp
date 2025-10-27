# CoTURN SSL Certificates (Scenario B: External Reverse Proxy)

This directory is used to store SSL certificates for CoTURN TURNS (TLS) support when deploying behind an external reverse proxy (NPM, Traefik, etc.).

## Required Files

Place the following files in this directory:

- **`fullchain.pem`** - Full certificate chain (certificate + intermediate certificates)
- **`privkey.pem`** - Private key

## How to Obtain Certificates

### Option 1: Automatic via DNS API (Recommended)

**Best for:** Users who want fully automated certificate management with auto-renewal.

**Supported DNS Providers:**
- Cloudflare (most popular)
- DigitalOcean
- AWS Route53
- Yandex Cloud DNS (Russia)

**How it works:**
The installer can automatically obtain and renew SSL certificates using DNS-01 ACME challenge via your DNS provider's API. This method:
- ✅ Works without port 80/443 access
- ✅ Fully automated (no manual steps)
- ✅ Auto-renewal every 90 days
- ✅ No downtime during renewal

**Setup during installation:**
When you run the installer and select "Scenario B: External Reverse Proxy", you will be asked:
```
How do you want to obtain SSL certificates for CoTURN TURNS?
1) Manual setup (I will provide certificates myself)
2) Automatic via DNS API (Cloudflare, DigitalOcean, etc.)
```

Select option 2 and follow the prompts to:
1. Choose your DNS provider
2. Enter your API token/credentials
3. Wait for automatic certificate provisioning

**Manual setup after installation:**
If you skipped DNS API setup during installation, you can still set it up manually:

#### Cloudflare Example:

```bash
# 1. Install certbot and Cloudflare plugin
sudo apt update
sudo apt install certbot python3-certbot-dns-cloudflare

# 2. Create credentials file
mkdir -p ./coturn-certs/dns-credentials
cat > ./coturn-certs/dns-credentials/cloudflare.ini << EOF
dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN
EOF
chmod 600 ./coturn-certs/dns-credentials/cloudflare.ini

# 3. Obtain certificate
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials ./coturn-certs/dns-credentials/cloudflare.ini \
  -d svaz.app

# 4. Copy certificates
sudo cp /etc/letsencrypt/live/svaz.app/fullchain.pem ./coturn-certs/
sudo cp /etc/letsencrypt/live/svaz.app/privkey.pem ./coturn-certs/
sudo chmod 644 ./coturn-certs/fullchain.pem
sudo chmod 600 ./coturn-certs/privkey.pem

# 5. Restart CoTURN
docker compose -f docker-compose.external-proxy.yml restart coturn

# 6. Setup auto-renewal (cron job)
cat > ~/renew-coturn-certs.sh << 'EOF'
#!/bin/bash
certbot renew --quiet
cp /etc/letsencrypt/live/svaz.app/fullchain.pem /opt/svazapp/coturn-certs/
cp /etc/letsencrypt/live/svaz.app/privkey.pem /opt/svazapp/coturn-certs/
docker compose -f /opt/svazapp/docker-compose.external-proxy.yml restart coturn
EOF
chmod +x ~/renew-coturn-certs.sh
(crontab -l 2>/dev/null; echo "0 0 1 * * ~/renew-coturn-certs.sh") | crontab -
```

**Get API Tokens:**
- **Cloudflare**: https://dash.cloudflare.com/profile/api-tokens (need DNS:Edit permission)
- **DigitalOcean**: https://cloud.digitalocean.com/account/api/tokens
- **AWS Route53**: https://console.aws.amazon.com/iam/home#/security_credentials
- **Yandex Cloud**: https://console.cloud.yandex.ru/folders

---

### Option 2: Using Certbot on Host Machine

If you have certbot installed on your VPS (outside Docker):

```bash
# Obtain certificate for your domain
sudo certbot certonly --standalone -d svaz.app

# Copy certificates to this directory
sudo cp /etc/letsencrypt/live/svaz.app/fullchain.pem ./coturn-certs/
sudo cp /etc/letsencrypt/live/svaz.app/privkey.pem ./coturn-certs/

# Set correct permissions
sudo chmod 644 ./coturn-certs/fullchain.pem
sudo chmod 600 ./coturn-certs/privkey.pem
```

### Option 3: Using Existing NPM Certificates

If your Nginx Proxy Manager is on the same server, you can copy its certificates:

```bash
# Find NPM certificate location (usually in Docker volume)
docker volume inspect npm_letsencrypt

# Copy certificates
sudo cp /path/to/npm/certificates/fullchain.pem ./coturn-certs/
sudo cp /path/to/npm/certificates/privkey.pem ./coturn-certs/
```

### Option 4: Manual Certificate Upload

If you obtained certificates elsewhere (ZeroSSL, your DNS provider, etc.):

1. Download `fullchain.pem` and `privkey.pem`
2. Upload them to this directory on your VPS
3. Ensure correct permissions (see above)

## Certificate Renewal

SSL certificates expire every 90 days. You must renew them manually:

```bash
# Renew with certbot
sudo certbot renew

# Copy new certificates
sudo cp /etc/letsencrypt/live/svaz.app/fullchain.pem ./coturn-certs/
sudo cp /etc/letsencrypt/live/svaz.app/privkey.pem ./coturn-certs/

# Restart CoTURN to load new certificates
docker compose -f docker-compose.external-proxy.yml restart coturn
```

## Verification

After placing certificates, restart CoTURN:

```bash
docker compose -f docker-compose.external-proxy.yml restart coturn
```

Check logs to verify TLS is enabled:

```bash
docker compose -f docker-compose.external-proxy.yml logs coturn
```

You should see:
```
✅ User-provided SSL certificates found!
TLS Status: ✅ ENABLED
```

## Troubleshooting

### "No SSL certificates found"

- Ensure files are named exactly `fullchain.pem` and `privkey.pem`
- Check file permissions (readable by Docker)
- Verify files are in the correct directory

### "TURNS (port 5349) will NOT work"

- This means certificates are missing or invalid
- CoTURN will still work on port 3478 (STUN/TURN without TLS)
- But TURNS is required for networks with DPI (Russia, etc.)

## Security Notes

- **Never commit certificates to Git!** (this directory is in `.gitignore`)
- Keep `privkey.pem` secure (chmod 600)
- Rotate certificates regularly (every 90 days)
- Use strong encryption (RSA 2048+ or ECDSA)

## See Also

- [DEPLOYMENT.md](../DEPLOYMENT.md) - Full deployment guide
- [PORTS.md](../PORTS.md) - Port configuration
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

