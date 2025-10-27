# SVAZ.APP Deployment Guide

**Welcome!** This guide will help you deploy svaz.app to your server.

> **For Beginners:** Don't worry if you're new to servers and Docker. We'll guide you step-by-step. If you can install programs on Windows, you can deploy svaz.app!

---

## 📋 Table of Contents

- [What is svaz.app?](#what-is-svazapp)
- [Choose Your Deployment Scenario](#choose-your-deployment-scenario)
- [Scenario A: Standalone VPS](#scenario-a-standalone-vps-recommended-for-beginners)
- [Scenario B: VPS Behind External Reverse Proxy](#scenario-b-vps-behind-external-reverse-proxy-npmtraefik)
- [Testing Your Deployment](#testing-your-deployment)
- [Troubleshooting](#troubleshooting)

---

## What is svaz.app?

**svaz.app** is a secure, autonomous communication platform that works even when the internet is down. It combines:

- 💬 **Encrypted Messaging** - Private chats with end-to-end encryption
- 📞 **Video/Audio Calls** - P2P calls that work offline
- 🔒 **Privacy-First** - Your data stays on your server
- 🌐 **PWA** - Works on any device (phone, tablet, computer)

---

## Choose Your Deployment Scenario

We offer **two deployment scenarios**. Choose the one that fits your setup:

### 🟢 Scenario A: Standalone VPS (Recommended)

**Best for:**
- You have a VPS (Virtual Private Server) from providers like DigitalOcean, Hetzner, AWS, etc.
- You want the simplest setup with automatic SSL certificates
- You're deploying for the first time

**What you get:**
- ✅ Automatic SSL certificates (Let's Encrypt)
- ✅ All-in-one setup with Caddy reverse proxy
- ✅ Easiest configuration

**Requirements:**
- VPS with Ubuntu 22.04+ (2GB RAM minimum)
- Domain name pointing to your VPS IP
- Ports 80, 443, 3478, 5349, 49152-65535 open

**Network Diagram:**

```
Internet → Your VPS (Caddy handles SSL)
         ↓
    [Caddy Reverse Proxy]
         ↓
    Frontend / API / LiveKit
```

---

### 🔵 Scenario B: VPS Behind External Reverse Proxy

**Best for:**
- You already have Nginx Proxy Manager (NPM), Traefik, or another reverse proxy
- You want to manage multiple applications with one reverse proxy
- You have a home server behind a router

**What you get:**
- ✅ Reuse existing SSL certificates
- ✅ Centralized proxy management
- ✅ Works with NPM, Traefik, Nginx, Apache

**Requirements:**
- VPS or home server with Docker
- Nginx Proxy Manager (or similar) already set up
- Router with port forwarding capability (for home servers)

**Network Diagram:**

```
Internet → Router → NPM (handles SSL)
                    ↓
              Your VPS (no Caddy)
                    ↓
         Frontend / API / LiveKit
```

---

**👉 Not sure which to choose?**

- **First time deploying?** → Choose **Scenario A**
- **Already using NPM?** → Choose **Scenario B**
- **Home server?** → Choose **Scenario B**

---

## Scenario A: Standalone VPS (Recommended for Beginners)

This is the **easiest** way to deploy svaz.app. Everything is automated!

### Option 1: Automated Installation (Recommended)

Run the interactive installer:

```bash
curl -fsSL https://raw.githubusercontent.com/geladons/svazapp/main/install.sh | bash
```

The installer will:
1. Ask you to choose deployment scenario (select **Standalone VPS**)
2. Ask you to choose installation mode (select **Quick Install** for beginners)
3. Prompt for your domain name and email
4. Automatically install Docker, configure firewall, and deploy all services
5. Obtain SSL certificates automatically

**That's it!** Skip to [Step 5: Verify Installation](#step-5-verify-installation) after the installer completes.

---

### Option 2: Manual Installation

If you prefer to install manually, follow these steps:

### Step 1: Get a VPS

You need a server. Here are some popular providers:

- **DigitalOcean** - $6/month ([Get $200 credit](https://www.digitalocean.com/))
- **Hetzner** - €4/month ([hetzner.com](https://www.hetzner.com/))
- **Vultr** - $6/month ([vultr.com](https://www.vultr.com/))
- **AWS Lightsail** - $5/month ([aws.amazon.com/lightsail](https://aws.amazon.com/lightsail/))

**Minimum Requirements:**
- **OS**: Ubuntu 22.04 LTS (recommended)
- **RAM**: 2GB minimum (4GB recommended)
- **Storage**: 20GB minimum
- **CPU**: 1 core minimum (2 cores recommended)

### Step 2: Point Your Domain to VPS

You need a domain name (e.g., `svaz.app`). If you don't have one, buy from:
- **Namecheap** ([namecheap.com](https://www.namecheap.com/))
- **Cloudflare** ([cloudflare.com](https://www.cloudflare.com/))
- **Google Domains** ([domains.google](https://domains.google/))

**Configure DNS:**

1. Go to your domain registrar's DNS settings
2. Create an **A record**:
   - **Name**: `@` (or leave blank for root domain)
   - **Type**: `A`
   - **Value**: Your VPS IP address (e.g., `123.45.67.89`)
   - **TTL**: `3600` (or automatic)

3. Wait 5-10 minutes for DNS to propagate

**Verify DNS:**
```bash
# On your computer, run:
ping svaz.app

# You should see your VPS IP address
```

### Step 3: Install svaz.app

SSH into your VPS:

```bash
ssh root@your-vps-ip
```

**Option A: Automated (Recommended)**

Run the interactive installer:

```bash
curl -fsSL https://raw.githubusercontent.com/geladons/svazapp/main/install.sh | bash
```

Select:
1. Deployment Scenario: **Standalone VPS**
2. Installation Mode: **Quick Install**
3. Enter your domain and email when prompted

The installer will automatically handle everything!

**Option B: Manual**

```bash
# Clone repository
git clone https://github.com/geladons/svazapp.git
cd svazapp

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
# Set DOMAIN, SSL_EMAIL, and generate secrets (see ENV_VARIABLES.md)

# Start services
docker compose up -d
```

### Step 4: Open Firewall Ports

The installer will ask if you want to configure the firewall. Say **yes**.

If you need to do it manually:

```bash
# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp

# Allow STUN/TURN
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp
sudo ufw allow 49152:65535/udp

# Enable firewall
sudo ufw enable
```

### Step 5: Verify Installation

Open your browser and go to:

```
https://svaz.app
```

You should see the svaz.app login page with a valid SSL certificate (🔒 green lock).

**✅ Done!** Your svaz.app is now running!

---

## Scenario B: VPS Behind External Reverse Proxy (NPM/Traefik)

This scenario is for users who already have a reverse proxy (like Nginx Proxy Manager) managing SSL certificates.

### Architecture Overview

In this setup:
- **NPM** (or your reverse proxy) handles SSL certificates and HTTP/HTTPS traffic
- **Your VPS** runs svaz.app without Caddy
- **CoTURN** ports are forwarded directly from router to VPS (bypassing NPM)

**Important:** NPM cannot proxy UDP traffic (CoTURN). You must forward ports 3478, 5349, and 49152-65535 directly from your router to your VPS.

---

### Option 1: Automated Installation (Recommended)

Run the interactive installer:

```bash
curl -fsSL https://raw.githubusercontent.com/geladons/svazapp/main/install.sh | bash
```

Select:
1. Deployment Scenario: **VPS Behind External Reverse Proxy**
2. Installation Mode: **Quick Install** (or **Advanced** for more control)
3. Enter your domain and email when prompted

The installer will:
- Install Docker and dependencies
- Clone the repository
- Generate secure secrets automatically
- Create `.env` file with correct configuration
- Start services using `docker-compose.external-proxy.yml`
- Configure firewall for external proxy mode

After installation, skip to [Step 5: Configure Router Port Forwarding](#step-5-configure-router-port-forwarding).

---

### Option 2: Manual Installation

### Step 1: Prepare Your VPS

SSH into your VPS:

```bash
ssh user@your-vps-ip
```

Install Docker and Docker Compose:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### Step 2: Clone Repository

```bash
cd ~
git clone https://github.com/geladons/svazapp.git
cd svazapp
```

### Step 3: Configure Environment

Copy the external proxy example:

```bash
cp .env.external-proxy.example .env
```

Edit the `.env` file:

```bash
nano .env
```

**Required changes:**

```bash
# Your domain
DOMAIN=svaz.app

# Your email
SSL_EMAIL=admin@svaz.app

# Generate secure secrets (run these commands):
# JWT_SECRET
openssl rand -base64 48

# COTURN_PASSWORD
openssl rand -base64 32

# SESSION_SECRET
openssl rand -base64 32

# LiveKit secrets
openssl rand -hex 16  # LIVEKIT_API_KEY
openssl rand -base64 32  # LIVEKIT_API_SECRET
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`).

### Step 4: Start Services

Use the external proxy docker-compose file:

```bash
docker compose -f docker-compose.external-proxy.yml up -d
```

Verify all containers are running:

```bash
docker compose -f docker-compose.external-proxy.yml ps
```

You should see:
- ✅ `svazapp-frontend` (port 3000)
- ✅ `svazapp-api` (port 8080)
- ✅ `svazapp-livekit` (port 7880)
- ✅ `svazapp-coturn` (ports 3478, 5349, 49152-65535)
- ✅ `svazapp-db` (port 5432)

---

### Step 5: Configure Router Port Forwarding

**⚠️ Critical:** CoTURN requires direct port forwarding from your router to your VPS.

Log into your router's admin panel (usually `192.168.1.1` or `192.168.0.1`).

**Forward these ports to your VPS IP:**

| External Port | Internal IP | Internal Port | Protocol | Service |
|---------------|-------------|---------------|----------|---------|
| 80 | NPM IP | 80 | TCP | NPM (HTTP) |
| 443 | NPM IP | 443 | TCP | NPM (HTTPS) |
| 3478 | VPS IP | 3478 | TCP+UDP | CoTURN (STUN) |
| 5349 | VPS IP | 5349 | TCP+UDP | CoTURN (TURNS) |
| 49152-65535 | VPS IP | 49152-65535 | UDP | CoTURN (Relay) |

**Example (TP-Link Router):**
1. Go to **Advanced** → **NAT Forwarding** → **Virtual Servers**
2. Click **Add**
3. Fill in:
   - **Service Port**: `3478`
   - **Internal Port**: `3478`
   - **IP Address**: `192.168.1.20` (your VPS IP)
   - **Protocol**: `ALL` (or `TCP+UDP`)
4. Repeat for ports 5349 and 49152-65535

---

### Step 6: Configure SSL Certificates for CoTURN (TURNS)

**⚠️ CRITICAL:** CoTURN requires SSL certificates for TURNS (port 5349) to work in networks with DPI (Deep Packet Inspection).

**Why is this needed?**
- Russia, China, Iran, and other countries use DPI to block unencrypted TURN traffic
- Corporate networks often block non-TLS protocols on unusual ports
- Without TURNS, video calls will fail in these networks

**How to obtain certificates:**

#### Option 1: Automatic via DNS API (Recommended)

**Best for:** Fully automated certificate management with auto-renewal.

The installer can automatically obtain and renew SSL certificates using DNS-01 ACME challenge via your DNS provider's API.

**Supported DNS Providers:**
- Cloudflare (most popular)
- DigitalOcean
- AWS Route53
- Yandex Cloud DNS (Russia)

**During installation:**
When you run the installer and select "Scenario B: External Reverse Proxy", you will be asked:
```
How do you want to obtain SSL certificates for CoTURN TURNS?
1) Manual setup (I will provide certificates myself)
2) Automatic via DNS API (Cloudflare, DigitalOcean, etc.)
```

Select option 2 and follow the prompts. The installer will:
- Install certbot and appropriate DNS plugin
- Obtain SSL certificate via DNS-01 challenge
- Copy certificates to `./coturn-certs/`
- Setup automatic renewal (runs monthly)

**Manual setup after installation:**
See `./coturn-certs/README.md` for detailed instructions on setting up DNS API manually.

---

#### Option 2: Using Certbot (Standalone Mode)

If you have certbot installed on your VPS:

```bash
# Install certbot (if not already installed)
sudo apt update
sudo apt install certbot

# Obtain certificate for your domain
# Note: Port 80 must be accessible (temporarily stop NPM if needed)
sudo certbot certonly --standalone -d svaz.app

# Copy certificates to coturn-certs directory
cd /path/to/svazapp
sudo cp /etc/letsencrypt/live/svaz.app/fullchain.pem ./coturn-certs/
sudo cp /etc/letsencrypt/live/svaz.app/privkey.pem ./coturn-certs/

# Set correct permissions
sudo chmod 644 ./coturn-certs/fullchain.pem
sudo chmod 600 ./coturn-certs/privkey.pem

# Restart CoTURN to load certificates
docker compose -f docker-compose.external-proxy.yml restart coturn
```

#### Option 3: Copy from NPM

If NPM is on the same server, you can copy its certificates:

```bash
# Find NPM certificate location
docker volume inspect npm_letsencrypt

# Copy certificates (adjust path based on volume location)
sudo cp /var/lib/docker/volumes/npm_letsencrypt/_data/live/svaz.app/fullchain.pem ./coturn-certs/
sudo cp /var/lib/docker/volumes/npm_letsencrypt/_data/live/svaz.app/privkey.pem ./coturn-certs/

# Set permissions
sudo chmod 644 ./coturn-certs/fullchain.pem
sudo chmod 600 ./coturn-certs/privkey.pem

# Restart CoTURN
docker compose -f docker-compose.external-proxy.yml restart coturn
```

#### Option 4: Manual Upload

If you obtained certificates elsewhere (ZeroSSL, your DNS provider, etc.):

1. Download `fullchain.pem` and `privkey.pem`
2. Upload them to `./coturn-certs/` directory on your VPS
3. Set correct permissions (see above)
4. Restart CoTURN

**Verify TURNS is working:**

```bash
# Check CoTURN logs
docker compose -f docker-compose.external-proxy.yml logs coturn

# You should see:
# ✅ User-provided SSL certificates found!
# TLS Status: ✅ ENABLED
```

**Certificate Renewal:**

SSL certificates expire every 90 days. Set up automatic renewal:

```bash
# Create renewal script
cat > ~/renew-coturn-certs.sh << 'EOF'
#!/bin/bash
sudo certbot renew
sudo cp /etc/letsencrypt/live/svaz.app/fullchain.pem /path/to/svazapp/coturn-certs/
sudo cp /etc/letsencrypt/live/svaz.app/privkey.pem /path/to/svazapp/coturn-certs/
docker compose -f /path/to/svazapp/docker-compose.external-proxy.yml restart coturn
EOF

chmod +x ~/renew-coturn-certs.sh

# Add to crontab (runs monthly)
(crontab -l 2>/dev/null; echo "0 0 1 * * ~/renew-coturn-certs.sh") | crontab -
```

---

### Step 7: Configure Nginx Proxy Manager (NPM)

**Important:** You will create **ONE** proxy host for your domain with **Custom Locations** for API and LiveKit.

#### 7.1 Create Main Proxy Host

1. Open NPM web interface (usually `http://npm-ip:81`)
2. Go to **Hosts** → **Proxy Hosts**
3. Click **Add Proxy Host**

**Details Tab:**

- **Domain Names**: `svaz.app` (your domain)
- **Scheme**: `http`
- **Forward Hostname / IP**: `192.168.1.20` (your VPS IP)
- **Forward Port**: `3000` (frontend port)
- **Cache Assets**: ✅ Enabled
- **Block Common Exploits**: ✅ Enabled
- **Websockets Support**: ✅ **ENABLED** (critical for Socket.io)

**SSL Tab:**

- **SSL Certificate**: Select existing or create new Let's Encrypt certificate
- **Force SSL**: ✅ Enabled
- **HTTP/2 Support**: ✅ Enabled
- **HSTS Enabled**: ✅ Enabled

Click **Save**.

---

#### 7.2 Add Custom Location for API

1. Edit the proxy host you just created
2. Go to **Custom Locations** tab
3. Click **Add Location**

**Custom Location 1 (API):**

- **Define Location**: `/api`
- **Scheme**: `http`
- **Forward Hostname / IP**: `192.168.1.20` (your VPS IP)
- **Forward Port**: `8080` (API port)
- **Websockets Support**: ✅ **ENABLED** (critical for Socket.io)

**Advanced Tab** (paste this):

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# WebSocket support
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

# Timeouts for long-lived connections
proxy_read_timeout 86400;
proxy_send_timeout 86400;
```

Click **Save**.

---

#### 7.3 Add Custom Location for LiveKit

1. Still in **Custom Locations** tab
2. Click **Add Location**

**Custom Location 2 (LiveKit):**

- **Define Location**: `/livekit`
- **Scheme**: `http`
- **Forward Hostname / IP**: `192.168.1.20` (your VPS IP)
- **Forward Port**: `7880` (LiveKit port)
- **Websockets Support**: ✅ **ENABLED**

**Advanced Tab** (paste this):

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# WebSocket support for LiveKit
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

# Timeouts for video streaming
proxy_read_timeout 86400;
proxy_send_timeout 86400;
```

Click **Save**.

---

#### 7.4 Add Custom Location for Socket.io

1. Still in **Custom Locations** tab
2. Click **Add Location**

**Custom Location 3 (Socket.io):**

- **Define Location**: `/socket.io`
- **Scheme**: `http`
- **Forward Hostname / IP**: `192.168.1.20` (your VPS IP)
- **Forward Port**: `8080` (API port - Socket.io runs on same server)
- **Websockets Support**: ✅ **ENABLED**

**Advanced Tab** (paste this):

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# WebSocket support for Socket.io
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

# Socket.io specific
proxy_buffering off;
proxy_read_timeout 86400;
proxy_send_timeout 86400;
```

Click **Save**.

---

### Step 8: Verify NPM Configuration

Your NPM proxy host should now have:

1. **Main location** (`/`) → `192.168.1.20:3000` (Frontend)
2. **Custom location** (`/api`) → `192.168.1.20:8080` (API)
3. **Custom location** (`/livekit`) → `192.168.1.20:7880` (LiveKit)
4. **Custom location** (`/socket.io`) → `192.168.1.20:8080` (Socket.io)

**All locations must have WebSocket support enabled!**

---

## Testing Your Deployment

### 1. Test HTTPS Access

Open your browser and go to:

```
https://svaz.app
```

You should see:
- ✅ svaz.app login page
- ✅ Green lock icon (valid SSL certificate)
- ✅ No browser errors in console (F12)

### 2. Test API

Open browser console (F12) and run:

```javascript
fetch('https://svaz.app/api/health')
  .then(r => r.json())
  .then(console.log)
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2025-10-26T...",
  "database": "connected"
}
```

### 3. Test WebSocket (Socket.io)

Open browser console and run:

```javascript
const socket = io('https://svaz.app');
socket.on('connect', () => console.log('✅ Socket.io connected!'));
socket.on('connect_error', (err) => console.error('❌ Socket.io error:', err));
```

You should see: `✅ Socket.io connected!`

### 4. Test TURN Server

Use this online tool: [WebRTC Trickle ICE Test](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/)

1. Add your TURN server:
   - **TURN URI**: `turn:svaz.app:3478`
   - **Username**: (get from `/api/turn-credentials` endpoint)
   - **Password**: (get from `/api/turn-credentials` endpoint)

2. Click **Gather candidates**

3. You should see:
   - ✅ `srflx` candidates (STUN working)
   - ✅ `relay` candidates (TURN working)

### 5. Test Video Call

1. Register two accounts on svaz.app
2. Add each other as contacts
3. Start a video call
4. Verify:
   - ✅ Video and audio work
   - ✅ Connection is stable
   - ✅ No errors in browser console

---

## Troubleshooting

### Issue: "Cannot connect to server"

**Symptoms:**
- Browser shows "Cannot connect" or "ERR_CONNECTION_REFUSED"
- Page doesn't load

**Solutions:**

1. **Check if containers are running:**
   ```bash
   docker compose ps
   # or
   docker compose -f docker-compose.external-proxy.yml ps
   ```

2. **Check container logs:**
   ```bash
   docker compose logs frontend
   docker compose logs api
   ```

3. **Verify ports are open:**
   ```bash
   sudo ufw status
   ```

4. **Check DNS:**
   ```bash
   ping svaz.app
   # Should return your VPS IP
   ```

---

### Issue: "SSL Certificate Error"

**Symptoms:**
- Browser shows "Your connection is not private"
- Certificate is invalid or self-signed

**Solutions (Scenario A - Caddy):**

1. **Check Caddy logs:**
   ```bash
   docker compose logs caddy
   ```

2. **Verify domain points to VPS:**
   ```bash
   dig svaz.app +short
   # Should return your VPS IP
   ```

3. **Restart Caddy:**
   ```bash
   docker compose restart caddy
   ```

**Solutions (Scenario B - NPM):**

1. Check NPM SSL certificate is valid
2. Force SSL is enabled in NPM
3. Certificate is not expired

---

### Issue: "WebSocket connection failed"

**Symptoms:**
- Socket.io doesn't connect
- Real-time features don't work
- Browser console shows WebSocket errors

**Solutions:**

1. **Verify WebSocket support is enabled in NPM** (all locations!)

2. **Check API logs:**
   ```bash
   docker compose logs api | grep -i websocket
   ```

3. **Test WebSocket directly:**
   ```bash
   # Install wscat
   npm install -g wscat

   # Test connection
   wscat -c wss://svaz.app/socket.io/?EIO=4&transport=websocket
   ```

---

### Issue: "Video calls don't connect"

**Symptoms:**
- Video call starts but no video/audio
- "Connecting..." forever
- ICE connection failed

**Solutions:**

1. **Check CoTURN is running:**
   ```bash
   docker compose ps coturn
   ```

2. **Verify ports are forwarded:**
   - Router forwards 3478, 5349, 49152-65535 to VPS
   - Firewall allows these ports

3. **Test TURN server:**
   - Use [Trickle ICE](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/)
   - Should see `relay` candidates

4. **Check TURN credentials:**
   ```bash
   # Get temporary credentials
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://svaz.app/api/turn-credentials
   ```

---

### Issue: "Database connection failed"

**Symptoms:**
- API logs show "Database connection error"
- Cannot register or login

**Solutions:**

1. **Check database is running:**
   ```bash
   docker compose ps db
   ```

2. **Check database logs:**
   ```bash
   docker compose logs db
   ```

3. **Verify DATABASE_URL in .env:**
   ```bash
   grep DATABASE_URL .env
   ```

4. **Restart database:**
   ```bash
   docker compose restart db
   ```

---

## Post-Deployment

### View Service Status

Check that all services are running:

```bash
docker compose ps
# or for external proxy mode:
docker compose -f docker-compose.external-proxy.yml ps
```

All services should show status `Up`.

### View Logs

```bash
# All services
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100

# Specific service
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f livekit
docker compose logs -f coturn
```

### Resource Usage

Monitor Docker container resource usage:

```bash
docker stats
```

### Health Checks

Test individual services:

```bash
# API health
curl http://localhost:8080/api/health

# Frontend health (Scenario A)
curl http://localhost:3000/

# Frontend health (Scenario B)
curl http://localhost:3000/

# LiveKit health
curl http://localhost:7880/
```

---

## Backup and Restore

### Database Backup

**Create backup:**

```bash
# Create backup directory
mkdir -p backups

# Backup database
docker compose exec -T db pg_dump -U svazapp svazapp > backups/svazapp_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
gzip backups/svazapp_$(date +%Y%m%d_%H%M%S).sql
```

**Automated daily backups (cron):**

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * cd /opt/svazapp && docker compose exec -T db pg_dump -U svazapp svazapp | gzip > backups/svazapp_$(date +\%Y\%m\%d).sql.gz
```

### Restore Database

```bash
# Stop API to prevent connections
docker compose stop api

# Restore from backup
gunzip -c backups/svazapp_20250126.sql.gz | docker compose exec -T db psql -U svazapp svazapp

# Start API
docker compose start api
```

### Full Backup (Including Uploads)

```bash
# Backup everything
tar -czf svazapp_full_backup_$(date +%Y%m%d).tar.gz \
  .env \
  docker-compose.yml \
  backups/ \
  uploads/

# Store backup securely (off-site)
# Example: Upload to S3, rsync to remote server, etc.
```

---

## Updating

### Update Application Code

```bash
# Navigate to installation directory
cd /opt/svazapp  # or your custom directory

# Pull latest changes
git pull origin main

# Rebuild and restart services
docker compose down
docker compose build --no-cache
docker compose up -d

# Run database migrations (if any)
docker compose exec api npx prisma migrate deploy
```

### Update Docker Images

```bash
# Pull latest base images
docker compose pull

# Rebuild services
docker compose build --no-cache

# Restart
docker compose down
docker compose up -d
```

### Update Specific Service

```bash
# Example: Update only frontend
docker compose build --no-cache frontend
docker compose up -d frontend
```

---

## Monitoring

### Service Status Dashboard

View all services at a glance:

```bash
docker compose ps
```

### Real-time Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api

# Filter by error level
docker compose logs | grep -i error
```

### Disk Space Monitoring

```bash
# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Clean up unused Docker resources
docker system prune -a
```

### Performance Monitoring

```bash
# Container resource usage
docker stats

# System resource usage
htop  # or top
```

---

## Security Best Practices

1. **Change all default passwords and secrets**
   - Generate strong, unique passwords (minimum 32 characters)
   - Use `openssl rand -base64 32` for secrets

2. **Keep system updated**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Enable firewall**
   - See [PORTS.md](PORTS.md) for firewall configuration

4. **Secure .env file**
   ```bash
   chmod 600 .env
   ```
   - Never commit `.env` to git
   - Keep backups encrypted

5. **Regular backups**
   - Automate daily database backups
   - Store backups off-site
   - Test restore procedure regularly

6. **Monitor logs**
   ```bash
   # Check for suspicious activity
   docker compose logs | grep -i "failed\|error\|unauthorized"
   ```

7. **Use HTTPS only**
   - Disable HTTP if possible
   - Enable HSTS headers (already configured in Caddy)

8. **Rate limiting**
   - Already configured in API
   - Adjust `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW` in `.env` if needed

9. **Regular security audits**
   ```bash
   # Check for outdated npm packages
   docker compose exec api npm audit
   docker compose exec frontend npm audit
   ```

10. **Restrict database access**
    - Database should only be accessible from Docker network
    - Never expose port 5432 to internet

---

## Advanced Configuration

For advanced topics, see:

- **[Environment Variables Guide](ENV_VARIABLES.md)** - Complete reference for all ENV variables
- **[Ports Configuration](PORTS.md)** - Detailed port configuration and firewall setup
- **[Development Guide](DEVELOPMENT.md)** - Local development setup

---

## Need Help?

- 📖 **Documentation**: [github.com/geladons/svazapp](https://github.com/geladons/svazapp)
- 🐛 **Issues**: [github.com/geladons/svazapp/issues](https://github.com/geladons/svazapp/issues)
- 💬 **Discussions**: [github.com/geladons/svazapp/discussions](https://github.com/geladons/svazapp/discussions)

---

**🎉 Congratulations!** Your svaz.app is now deployed and ready to use!


