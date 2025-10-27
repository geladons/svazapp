# CoTURN SSL Certificates (Scenario B: External Reverse Proxy)

This directory is used to store SSL certificates for CoTURN TURNS (TLS) support when deploying behind an external reverse proxy (NPM, Traefik, etc.).

## Required Files

Place the following files in this directory:

- **`fullchain.pem`** - Full certificate chain (certificate + intermediate certificates)
- **`privkey.pem`** - Private key

## How to Obtain Certificates

### Option 1: Using Certbot on Host Machine

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

### Option 2: Using Existing NPM Certificates

If your Nginx Proxy Manager is on the same server, you can copy its certificates:

```bash
# Find NPM certificate location (usually in Docker volume)
docker volume inspect npm_letsencrypt

# Copy certificates
sudo cp /path/to/npm/certificates/fullchain.pem ./coturn-certs/
sudo cp /path/to/npm/certificates/privkey.pem ./coturn-certs/
```

### Option 3: Manual Certificate Upload

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

