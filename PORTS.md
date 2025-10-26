# Port Configuration Guide - svaz.app

This document describes all network ports used by svaz.app and how to configure them.

## Table of Contents

- [Default Port Configuration](#default-port-configuration)
- [Required Ports (Must Be Open)](#required-ports-must-be-open)
- [Optional Ports](#optional-ports)
- [Changing Default Ports](#changing-default-ports)
- [Firewall Configuration](#firewall-configuration)
- [Using External Reverse Proxy](#using-external-reverse-proxy)

---

## Default Port Configuration

### External Ports (Exposed to Internet)

| Port | Protocol | Service | Purpose | Required |
|------|----------|---------|---------|----------|
| **80** | TCP | Caddy | HTTP (redirects to HTTPS) | ✅ Yes |
| **443** | TCP | Caddy | HTTPS (main application) | ✅ Yes |
| **443** | UDP | Caddy | HTTP/3 (QUIC) | ⚠️ Optional |
| **3478** | UDP/TCP | CoTURN | STUN server | ✅ Yes |
| **5349** | UDP/TCP | CoTURN | TURNS (STUN over TLS) | ⚠️ Optional |
| **49152-65535** | UDP | CoTURN | TURN relay port range | ✅ Yes |

### Internal Ports (Docker Network Only)

| Port | Service | Purpose | Exposed to Host |
|------|---------|---------|-----------------|
| **3000** | Frontend | Next.js application | ❌ No |
| **8080** | API | Fastify backend | ❌ No |
| **5432** | PostgreSQL | Database | ✅ Yes (for dev) |
| **7880** | LiveKit | SFU server (HTTP) | ❌ No |
| **7881** | LiveKit | SFU server (WebRTC) | ❌ No |
| **2019** | Caddy | Admin API | ❌ No |

---

## Required Ports (Must Be Open)

### For Production Deployment

You **MUST** open these ports in your firewall for svaz.app to work:

#### 1. **Port 80 (HTTP)**
- **Purpose**: Let's Encrypt certificate validation (HTTP-01 challenge)
- **Protocol**: TCP
- **Direction**: Inbound
- **Can be closed after SSL setup?**: ❌ No (needed for auto-renewal)

#### 2. **Port 443 (HTTPS)**
- **Purpose**: Main application access (web interface)
- **Protocol**: TCP
- **Direction**: Inbound
- **Can be changed?**: ✅ Yes (see [Using External Reverse Proxy](#using-external-reverse-proxy))

#### 3. **Port 3478 (STUN/TURN)**
- **Purpose**: NAT traversal for WebRTC connections
- **Protocol**: UDP and TCP
- **Direction**: Inbound
- **Can be changed?**: ✅ Yes (via `COTURN_LISTENING_PORT` in `.env`)

#### 4. **Ports 49152-65535 (TURN Relay)**
- **Purpose**: Media relay for WebRTC when direct P2P fails
- **Protocol**: UDP
- **Direction**: Inbound
- **Can be changed?**: ✅ Yes (via `COTURN_MIN_PORT` and `COTURN_MAX_PORT` in `.env`)
- **Can be reduced?**: ✅ Yes (minimum ~1000 ports recommended)

---

## Optional Ports

### Port 5349 (TURNS - STUN over TLS)
- **Purpose**: Encrypted STUN/TURN (rarely needed)
- **Protocol**: UDP/TCP
- **Required?**: ❌ No (most clients use port 3478)
- **When needed?**: Corporate networks that block non-TLS traffic

### Port 443/UDP (HTTP/3)
- **Purpose**: QUIC protocol for faster HTTPS
- **Required?**: ❌ No (falls back to HTTP/2)
- **Performance benefit**: ~10-20% faster page loads

---

## Changing Default Ports

### Scenario 1: Port 443 is Already in Use

If you have another service using port 443 (e.g., Nginx, Apache), you have two options:

#### Option A: Use External Reverse Proxy (Recommended)

See [Using External Reverse Proxy](#using-external-reverse-proxy) section below.

#### Option B: Change Caddy's External Port

**Not recommended** - breaks standard HTTPS expectations.

Edit `docker-compose.yml`:

```yaml
caddy:
  ports:
    - '80:80'
    - '8443:443'  # Changed from 443:443
    - '8443:443/udp'
```

Users will need to access: `https://your-domain.com:8443`

### Scenario 2: Port 80 is Already in Use

#### Option A: Use External Reverse Proxy

See [Using External Reverse Proxy](#using-external-reverse-proxy) section below.

#### Option B: Disable Caddy's Port 80

**Warning**: This breaks automatic SSL certificate renewal!

Edit `docker-compose.yml`:

```yaml
caddy:
  ports:
    # - '80:80'  # Commented out
    - '443:443'
    - '443:443/udp'
```

You'll need to manually obtain SSL certificates.

### Scenario 3: Change CoTURN Ports

Edit `.env`:

```bash
# Change STUN/TURN port (default: 3478)
COTURN_LISTENING_PORT=13478

# Change TLS port (default: 5349)
COTURN_TLS_LISTENING_PORT=15349

# Reduce relay port range (default: 49152-65535)
COTURN_MIN_PORT=50000
COTURN_MAX_PORT=51000  # 1000 ports (enough for ~500 concurrent calls)
```

**Important**: After changing CoTURN ports, update frontend environment:

```bash
# In .env
NEXT_PUBLIC_STUN_URL=stun:${DOMAIN}:13478
NEXT_PUBLIC_TURN_URL=turn:${DOMAIN}:13478
```

Then rebuild:

```bash
docker compose down
docker compose build frontend
docker compose up -d
```

### Scenario 4: Change Internal Ports

Edit `.env`:

```bash
# Frontend port (default: 3000)
FRONTEND_PORT=4000

# API port (default: 8080)
API_PORT=9000
```

These ports are internal to Docker network, so changing them rarely needed.

---

## Firewall Configuration

### Ubuntu/Debian (UFW)

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp

# Allow STUN/TURN
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp

# Allow TURN relay range
sudo ufw allow 49152:65535/udp

# Enable firewall
sudo ufw enable
```

### CentOS/RHEL (firewalld)

```bash
# Allow HTTP and HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Allow STUN/TURN
sudo firewall-cmd --permanent --add-port=3478/tcp
sudo firewall-cmd --permanent --add-port=3478/udp
sudo firewall-cmd --permanent --add-port=5349/tcp
sudo firewall-cmd --permanent --add-port=5349/udp

# Allow TURN relay range
sudo firewall-cmd --permanent --add-port=49152-65535/udp

# Reload firewall
sudo firewall-cmd --reload
```

### Cloud Provider Firewalls

#### AWS Security Group

```
Inbound Rules:
- Type: HTTP, Protocol: TCP, Port: 80, Source: 0.0.0.0/0
- Type: HTTPS, Protocol: TCP, Port: 443, Source: 0.0.0.0/0
- Type: Custom UDP, Protocol: UDP, Port: 443, Source: 0.0.0.0/0
- Type: Custom TCP, Protocol: TCP, Port: 3478, Source: 0.0.0.0/0
- Type: Custom UDP, Protocol: UDP, Port: 3478, Source: 0.0.0.0/0
- Type: Custom UDP, Protocol: UDP, Port: 49152-65535, Source: 0.0.0.0/0
```

#### Google Cloud Firewall

```bash
# HTTP/HTTPS
gcloud compute firewall-rules create svazapp-web \
  --allow tcp:80,tcp:443,udp:443 \
  --source-ranges 0.0.0.0/0

# STUN/TURN
gcloud compute firewall-rules create svazapp-webrtc \
  --allow tcp:3478,udp:3478,udp:49152-65535 \
  --source-ranges 0.0.0.0/0
```

---

## Using External Reverse Proxy

If you already have a reverse proxy (Nginx Proxy Manager, Traefik, Nginx, Apache), you can use it instead of Caddy.

### Benefits
- ✅ Reuse existing SSL certificates
- ✅ Centralized proxy management
- ✅ No port conflicts
- ✅ Easier multi-app hosting

### Setup with Nginx Proxy Manager (NPM)

#### 1. Disable Caddy

Edit `docker-compose.yml`:

```yaml
# Comment out or remove the caddy service
# caddy:
#   build:
#     context: ./caddy
#   ...
```

#### 2. Expose Internal Ports

Edit `docker-compose.yml`:

```yaml
frontend:
  ports:
    - '3000:3000'  # Add this line

api:
  ports:
    - '8080:8080'  # Add this line

livekit:
  ports:
    - '7880:7880'  # Add this line
```

#### 3. Update Environment Variables

Edit `.env`:

```bash
# Change to your external domain
DOMAIN=svaz.app

# No SSL_EMAIL needed (NPM handles SSL)

# Update URLs to use external domain
CORS_ORIGIN=https://svaz.app
NEXT_PUBLIC_API_URL=https://svaz.app/api
NEXT_PUBLIC_SOCKET_URL=https://svaz.app
NEXT_PUBLIC_LIVEKIT_URL=wss://svaz.app/livekit
```

#### 4. Configure NPM Proxy Hosts

Create 3 proxy hosts in NPM:

**Proxy Host 1: Main Application**
- Domain: `svaz.app`
- Scheme: `http`
- Forward Hostname/IP: `<server-ip>`
- Forward Port: `3000`
- WebSockets Support: ✅ Enabled
- SSL: ✅ Enabled (Let's Encrypt)

**Proxy Host 2: API**
- Domain: `svaz.app`
- Path: `/api`
- Scheme: `http`
- Forward Hostname/IP: `<server-ip>`
- Forward Port: `8080`
- WebSockets Support: ✅ Enabled
- SSL: ✅ Enabled (same certificate)

**Proxy Host 3: LiveKit**
- Domain: `svaz.app`
- Path: `/livekit`
- Scheme: `http`
- Forward Hostname/IP: `<server-ip>`
- Forward Port: `7880`
- WebSockets Support: ✅ Enabled
- SSL: ✅ Enabled (same certificate)

#### 5. Restart Services

```bash
docker compose down
docker compose up -d
```

### Setup with Traefik

See [DEPLOYMENT.md](./DEPLOYMENT.md#using-traefik) for Traefik configuration.

### Setup with Nginx (Manual)

Example Nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name svaz.app;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # LiveKit
    location /livekit {
        proxy_pass http://localhost:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

---

## Port Testing

### Test if Ports are Open

```bash
# Test from external machine
nc -zv your-domain.com 80
nc -zv your-domain.com 443
nc -zuv your-domain.com 3478

# Test STUN server
stunclient your-domain.com 3478
```

### Check What's Using a Port

```bash
# Linux
sudo netstat -tulpn | grep :443
sudo lsof -i :443

# macOS
sudo lsof -i :443
```

---

## Troubleshooting

### Port Already in Use

**Error**: `bind: address already in use`

**Solution**:
1. Find what's using the port: `sudo lsof -i :443`
2. Stop the conflicting service or use external reverse proxy

### Firewall Blocking Ports

**Symptom**: Can't access application from internet

**Solution**:
1. Check firewall: `sudo ufw status` or `sudo firewall-cmd --list-all`
2. Open required ports (see [Firewall Configuration](#firewall-configuration))
3. Check cloud provider security groups

### CoTURN Not Working

**Symptom**: Video calls fail behind NAT

**Solution**:
1. Verify UDP ports 49152-65535 are open
2. Test STUN: `stunclient your-domain.com 3478`
3. Check CoTURN logs: `docker compose logs coturn`

---

## Summary

- **Minimum required ports**: 80, 443, 3478, 49152-65535
- **All ports are configurable** via `.env` and `docker-compose.yml`
- **External reverse proxy** is fully supported (NPM, Traefik, Nginx)
- **Firewall must allow** all required ports for WebRTC to work

For more information, see:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - Environment variables reference

