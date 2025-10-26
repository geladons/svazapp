# Deployment Guide - svaz.app

This guide provides detailed instructions for deploying svaz.app to a production server.

## Table of Contents

- [Automated Installation (Recommended)](#automated-installation-recommended)
- [Manual Installation](#manual-installation)
  - [Prerequisites](#prerequisites)
  - [Server Requirements](#server-requirements)
  - [Installation Steps](#installation-steps)
  - [Environment Configuration](#environment-configuration)
  - [SSL/TLS Setup](#ssltls-setup)
  - [Database Setup](#database-setup)
  - [Starting Services](#starting-services)
- [Post-Deployment](#post-deployment)
- [Backup and Restore](#backup-and-restore)
- [Troubleshooting](#troubleshooting)
- [Updating](#updating)

---

## Automated Installation (Recommended)

The easiest way to deploy svaz.app is using the automated installation script.

### Quick Installation

Run this single command on your server:

```bash
curl -fsSL https://raw.githubusercontent.com/yourusername/svazapp/main/install.sh | bash
```

Or with wget:

```bash
wget -qO- https://raw.githubusercontent.com/yourusername/svazapp/main/install.sh | bash
```

### What the Script Does

The installation script automatically:

1. ✅ **Detects your operating system** (Ubuntu, Debian, CentOS, Fedora, macOS)
2. ✅ **Checks system requirements** (RAM, disk space, CPU)
3. ✅ **Installs dependencies** (Docker, Docker Compose, Git, curl)
4. ✅ **Configures firewall** (opens required ports: 80, 443, 3478, 7880-7881, 50000-60000)
5. ✅ **Clones the repository** to `/opt/svazapp` (or custom directory)
6. ✅ **Generates secure secrets** (JWT, database passwords, API keys)
7. ✅ **Creates configuration files** from templates
8. ✅ **Deploys all services** with docker-compose
9. ✅ **Runs health checks** to verify all services are running
10. ✅ **Provides access credentials** (saved to `CREDENTIALS.txt`)

### Installation Options

#### Basic Installation (Quick Setup)

```bash
curl -fsSL https://raw.githubusercontent.com/yourusername/svazapp/main/install.sh | bash
```

The script will ask for:
- Your domain name (e.g., `svaz.app`)
- Admin email for SSL certificates (e.g., `admin@svaz.app`)

All secrets and passwords will be auto-generated.

#### Advanced Installation (Interactive)

```bash
curl -fsSL https://raw.githubusercontent.com/yourusername/svazapp/main/install.sh | bash -s -- --advanced
```

Interactive mode allows you to:
- Review and customize every environment variable
- Accept auto-generated values or provide your own
- Skip variables to use defaults

#### Custom Installation Directory

```bash
curl -fsSL https://raw.githubusercontent.com/yourusername/svazapp/main/install.sh | bash -s -- --dir /custom/path
```

Default installation directory is `/opt/svazapp`.

#### Unattended Installation (CI/CD)

```bash
curl -fsSL https://raw.githubusercontent.com/yourusername/svazapp/main/install.sh | bash -s -- \
  --yes \
  --domain svaz.app \
  --email admin@svaz.app \
  --dir /opt/svazapp
```

Flags:
- `--yes` - Skip all confirmations
- `--domain DOMAIN` - Set domain name
- `--email EMAIL` - Set admin email
- `--dir PATH` - Set installation directory

### Supported Platforms

- ✅ **Ubuntu** 20.04, 22.04, 24.04
- ✅ **Debian** 11, 12
- ✅ **CentOS** 8, 9
- ✅ **Fedora** 35+
- ✅ **macOS** 12+ (with Docker Desktop)

### After Installation

1. **View your credentials**:
   ```bash
   cat /opt/svazapp/CREDENTIALS.txt
   ```

2. **Access your application**:
   ```
   https://your-domain.com
   ```

3. **Delete credentials file** (after saving):
   ```bash
   rm /opt/svazapp/CREDENTIALS.txt
   ```

4. **View logs**:
   ```bash
   cd /opt/svazapp
   docker compose logs -f
   ```

---

## Manual Installation

## Prerequisites

### Required Software

- **Docker Engine** 24.0 or higher
- **Docker Compose** 2.20 or higher
- **Git** (for cloning the repository)

### Server Requirements

- **OS**: Ubuntu 22.04 LTS or later (recommended), Debian 11+, or any Linux with Docker support
- **CPU**: 2+ cores (4+ recommended for production)
- **RAM**: 4GB minimum (8GB+ recommended)
- **Storage**: 20GB minimum (SSD recommended)
- **Network**: Public IP address with open ports

### Required Ports

Ensure the following ports are open in your firewall:

- **80** (HTTP) - Required for Let's Encrypt certificate validation
- **443** (HTTPS) - Main application access
- **3478** (UDP/TCP) - STUN/TURN server
- **5349** (UDP/TCP) - STUNS/TURNS (TLS)
- **49152-65535** (UDP) - CoTURN relay port range

### Domain Name

- A registered domain name (e.g., `svaz.app`)
- DNS A record pointing to your server's public IP address
- Wait for DNS propagation (can take up to 48 hours)

---

## Installation Steps

### 1. Connect to Your Server

```bash
ssh user@your-server-ip
```

### 2. Install Docker and Docker Compose

If not already installed:

```bash
# Update package index
sudo apt update

# Install prerequisites
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to docker group (optional, to run docker without sudo)
sudo usermod -aG docker $USER
newgrp docker
```

### 3. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/svazapp.git
cd svazapp
```

---

## Environment Configuration

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Edit Environment Variables

```bash
nano .env
```

### 3. Required Changes

**CRITICAL**: You MUST change the following values for security:

#### Domain Configuration
```bash
DOMAIN=your-domain.com
SSL_EMAIL=your-email@example.com
```

#### Database Credentials
```bash
POSTGRES_PASSWORD=<generate-strong-password>
DATABASE_URL=postgresql://svazapp:<same-password>@db:5432/svazapp
```

#### JWT Secret
```bash
JWT_SECRET=<generate-random-string-min-32-chars>
```

**Generate secure secret:**
```bash
openssl rand -base64 32
```

#### LiveKit Credentials
```bash
LIVEKIT_API_KEY=<generate-random-string>
LIVEKIT_API_SECRET=<generate-random-string>
LIVEKIT_PUBLIC_URL=wss://your-domain.com/livekit
```

**Generate LiveKit credentials:**
```bash
# API Key
openssl rand -hex 16

# API Secret
openssl rand -base64 32
```

#### CoTURN Password
```bash
COTURN_PASSWORD=<generate-strong-password>
```

#### Session Secret
```bash
SESSION_SECRET=<generate-random-string>
```

**Generate session secret:**
```bash
openssl rand -base64 32
```

#### CORS Origin
```bash
CORS_ORIGIN=https://your-domain.com
```

### 4. Optional Configuration

- `JWT_EXPIRES_IN`: Token expiration (default: 90d)
- `LOG_LEVEL`: Logging level (info, warn, error, debug)
- `RATE_LIMIT_MAX`: Max requests per window (default: 100)
- `RATE_LIMIT_WINDOW`: Rate limit window (default: 15m)

---

## SSL/TLS Setup

Caddy automatically obtains and renews SSL certificates from Let's Encrypt.

### Prerequisites

1. **DNS must be configured**: Your domain's A record must point to your server's IP
2. **Port 80 must be accessible**: Required for Let's Encrypt HTTP-01 challenge
3. **Valid email**: Set in `SSL_EMAIL` for certificate notifications

### Verification

After starting services, Caddy will automatically:
1. Request a certificate from Let's Encrypt
2. Configure HTTPS with automatic redirects
3. Renew certificates before expiration

Check Caddy logs:
```bash
docker compose logs caddy
```

---

## Database Setup

### 1. Start Database Service

```bash
docker compose up -d db
```

### 2. Wait for Database to be Ready

```bash
docker compose logs -f db
```

Wait for: `database system is ready to accept connections`

### 3. Run Migrations

```bash
docker compose exec api npx prisma migrate deploy
```

---

## Starting Services

### 1. Build and Start All Services

```bash
docker compose up -d
```

### 2. Verify All Services are Running

```bash
docker compose ps
```

All services should show status `Up` or `Up (healthy)`.

### 3. Check Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f caddy
```

---

## Post-Deployment

### 1. Access Your Application

Navigate to: `https://your-domain.com`

You should see the svaz.app login page with a valid SSL certificate.

### 2. Create First User

1. Click "Register"
2. Fill in user details
3. Submit registration
4. Login with your credentials

### 3. Test Functionality

- **Authentication**: Login/logout
- **Contacts**: Add contacts
- **1-on-1 Calls**: Test video calls
- **Guest Calls**: Create and join guest calls
- **Chat**: Send messages
- **PWA Install**: Test PWA installation prompt

---

## Backup and Restore

### Database Backup

#### Create Backup

```bash
# Create backup directory
mkdir -p backups

# Backup database
docker compose exec -T db pg_dump -U svazapp svazapp > backups/svazapp-$(date +%Y%m%d-%H%M%S).sql
```

#### Restore from Backup

```bash
# Stop API service
docker compose stop api

# Restore database
cat backups/svazapp-YYYYMMDD-HHMMSS.sql | docker compose exec -T db psql -U svazapp svazapp

# Restart API service
docker compose start api
```

### Full Backup

```bash
# Backup .env file
cp .env backups/.env.backup

# Backup docker volumes
docker run --rm -v svazapp_postgres-data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/postgres-data-$(date +%Y%m%d).tar.gz -C /data .
```

### Automated Backups

Create a cron job for daily backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/svazapp && docker compose exec -T db pg_dump -U svazapp svazapp > backups/svazapp-$(date +\%Y\%m\%d).sql
```

---

## Troubleshooting

### SSL Certificate Issues

**Problem**: Certificate not obtained

**Solutions**:
1. Verify DNS A record: `dig your-domain.com`
2. Check port 80 is accessible: `curl http://your-domain.com`
3. Check Caddy logs: `docker compose logs caddy`
4. Ensure `DOMAIN` and `SSL_EMAIL` are correct in `.env`

### Database Connection Issues

**Problem**: API can't connect to database

**Solutions**:
1. Check database is running: `docker compose ps db`
2. Verify `DATABASE_URL` in `.env`
3. Check database logs: `docker compose logs db`
4. Restart API: `docker compose restart api`

### Services Not Starting

**Problem**: Services fail to start

**Solutions**:
1. Check Docker logs: `docker compose logs`
2. Verify `.env` file exists and has correct values
3. Check for port conflicts: `sudo netstat -tulpn | grep -E ':(80|443|3478|5349)'`
4. Rebuild services: `docker compose down && docker compose build && docker compose up -d`

### LiveKit Connection Issues

**Problem**: Video calls fail to connect

**Solutions**:
1. Verify `LIVEKIT_PUBLIC_URL` uses correct protocol (wss:// for HTTPS)
2. Check LiveKit logs: `docker compose logs livekit`
3. Verify firewall allows WebSocket connections
4. Test LiveKit health: `curl http://localhost:7880/`

### CoTURN Issues

**Problem**: Calls fail behind NAT/firewall

**Solutions**:
1. Verify UDP ports 49152-65535 are open
2. Check CoTURN logs: `docker compose logs coturn`
3. Test STUN server: Use online STUN test tools
4. Verify `COTURN_PASSWORD` matches in `.env`

---

## Updating

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
docker compose down
docker compose build
docker compose up -d

# Run new migrations (if any)
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

---

## Monitoring

### View Service Status

```bash
docker compose ps
```

### View Logs

```bash
# All services
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100

# Specific service
docker compose logs -f api
```

### Resource Usage

```bash
docker stats
```

### Health Checks

```bash
# API health
curl http://localhost:8080/api/health

# Frontend health
curl http://localhost:3000/

# LiveKit health
curl http://localhost:7880/
```

---

## Security Best Practices

1. **Change all default passwords and secrets**
2. **Keep Docker and system packages updated**
3. **Use strong, unique passwords (minimum 32 characters)**
4. **Enable firewall (ufw or iptables)**
5. **Regularly backup database**
6. **Monitor logs for suspicious activity**
7. **Keep `.env` file secure (never commit to git)**
8. **Use HTTPS only (disable HTTP if possible)**
9. **Implement rate limiting (already configured)**
10. **Regular security audits**

---

## Support

For deployment issues:
1. Check logs: `docker compose logs`
2. Review this guide
3. Check [Troubleshooting](#troubleshooting) section
4. Open an issue on GitHub

---

**Deployment completed successfully!** 🎉

Your svaz.app instance should now be accessible at `https://your-domain.com`

