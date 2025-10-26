# Environment Variables Reference - svaz.app

This document provides a complete reference for all environment variables used in svaz.app.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Domain Configuration](#domain-configuration)
- [Database Configuration](#database-configuration)
- [API Service Configuration](#api-service-configuration)
- [LiveKit Configuration](#livekit-configuration)
- [CoTURN Configuration](#coturn-configuration)
- [Frontend Configuration](#frontend-configuration)
- [Caddy Configuration](#caddy-configuration)
- [Security Configuration](#security-configuration)
- [Logging Configuration](#logging-configuration)
- [Generating Secure Secrets](#generating-secure-secrets)

---

## Quick Reference

### ✅ MUST Change (Security Critical)

These variables **MUST** be changed from default values for security:

| Variable | Purpose | How to Generate |
|----------|---------|-----------------|
| `DOMAIN` | Your domain name | Your actual domain |
| `SSL_EMAIL` | SSL certificate email | Your email |
| `POSTGRES_PASSWORD` | Database password | `openssl rand -base64 32` |
| `JWT_SECRET` | JWT signing key | `openssl rand -base64 32` |
| `LIVEKIT_API_KEY` | LiveKit API key | `openssl rand -hex 16` |
| `LIVEKIT_API_SECRET` | LiveKit secret | `openssl rand -base64 32` |
| `COTURN_PASSWORD` | TURN server password | `openssl rand -base64 32` |
| `SESSION_SECRET` | Session encryption | `openssl rand -base64 32` |

### ⚠️ Should Review (Environment-Specific)

These variables should be reviewed and adjusted for your environment:

| Variable | Default | When to Change |
|----------|---------|----------------|
| `CORS_ORIGIN` | `https://${DOMAIN}` | If using subdomain |
| `COTURN_MIN_PORT` | `49152` | If port range blocked |
| `COTURN_MAX_PORT` | `65535` | If port range blocked |
| `JWT_EXPIRES_IN` | `90d` | If need shorter sessions |
| `RATE_LIMIT_MAX` | `100` | If need stricter limits |

### ℹ️ Can Leave Default (Optional)

These variables can be left at default values:

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `production` | Runtime environment |
| `API_PORT` | `8080` | Internal API port |
| `FRONTEND_PORT` | `3000` | Internal frontend port |
| `LOG_LEVEL` | `info` | Logging verbosity |
| `POSTGRES_USER` | `svazapp` | Database username |
| `POSTGRES_DB` | `svazapp` | Database name |

---

## Domain Configuration

### `DOMAIN`

- **Required**: ✅ Yes
- **Default**: `svaz.app`
- **Must Change**: ✅ Yes
- **Description**: Your domain name where svaz.app will be accessible
- **Example**: `svaz.app`, `video.example.com`
- **Used By**: Caddy (SSL), API (CORS), Frontend (URLs)

**Important Notes**:
- Must be a valid domain name
- DNS A record must point to your server's IP
- Do NOT include `https://` or trailing slash
- Can be a subdomain (e.g., `video.example.com`)

### `SSL_EMAIL`

- **Required**: ✅ Yes (if using Caddy)
- **Default**: `admin@svaz.app`
- **Must Change**: ✅ Yes
- **Description**: Email for Let's Encrypt SSL certificate notifications
- **Example**: `admin@example.com`, `webmaster@example.com`
- **Used By**: Caddy (Let's Encrypt)

**Important Notes**:
- Must be a valid email address
- You'll receive certificate expiration warnings (if auto-renewal fails)
- Not required if using external reverse proxy

---

## Database Configuration

### `POSTGRES_USER`

- **Required**: ✅ Yes
- **Default**: `svazapp`
- **Must Change**: ❌ No (can leave default)
- **Description**: PostgreSQL database username
- **Used By**: PostgreSQL, API

### `POSTGRES_PASSWORD`

- **Required**: ✅ Yes
- **Default**: `change_this_secure_password`
- **Must Change**: ✅ **YES - CRITICAL**
- **Description**: PostgreSQL database password
- **Security**: Use strong, random password (minimum 32 characters)
- **Generate**: `openssl rand -base64 32`

**Example**:
```bash
POSTGRES_PASSWORD=xK9mP2vL8nQ4wR7tY6uI3oP5aS1dF0gH2jK4lM6nB8vC
```

### `POSTGRES_DB`

- **Required**: ✅ Yes
- **Default**: `svazapp`
- **Must Change**: ❌ No (can leave default)
- **Description**: PostgreSQL database name
- **Used By**: PostgreSQL, API

### `DATABASE_URL`

- **Required**: ✅ Yes
- **Default**: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}`
- **Must Change**: ❌ No (auto-generated from above variables)
- **Description**: Full PostgreSQL connection string
- **Format**: `postgresql://username:password@host:port/database`

**Important Notes**:
- Uses variable substitution from `POSTGRES_*` variables
- Host is `db` (Docker service name)
- Only change if using external database

---

## API Service Configuration

### `NODE_ENV`

- **Required**: ✅ Yes
- **Default**: `production`
- **Must Change**: ❌ No
- **Description**: Node.js environment mode
- **Allowed Values**: `production`, `development`
- **Used By**: API, Frontend

**When to Change**:
- Set to `development` for local development only
- Always use `production` for deployed instances

### `API_PORT`

- **Required**: ✅ Yes
- **Default**: `8080`
- **Must Change**: ❌ No (internal port)
- **Description**: Internal port for API service
- **Used By**: API, Caddy

**When to Change**:
- Only if port 8080 conflicts inside Docker network (rare)

### `JWT_SECRET`

- **Required**: ✅ Yes
- **Default**: `change_this_to_a_very_long_random_string_min_32_chars`
- **Must Change**: ✅ **YES - CRITICAL**
- **Description**: Secret key for signing JWT authentication tokens
- **Security**: Minimum 32 characters, random string
- **Generate**: `openssl rand -base64 32`

**Example**:
```bash
JWT_SECRET=7mK9pL2vN8qR4wT6yU3iO5aS1dF0gH2jK4lM6nB8vC9xZ
```

**Important Notes**:
- If changed, all users must re-login
- Never commit to version control
- Keep secret and secure

### `JWT_EXPIRES_IN`

- **Required**: ✅ Yes
- **Default**: `90d`
- **Must Change**: ❌ No
- **Description**: JWT token expiration time
- **Format**: `<number><unit>` (e.g., `7d`, `24h`, `90d`)
- **Units**: `s` (seconds), `m` (minutes), `h` (hours), `d` (days)

**When to Change**:
- Shorter for higher security (e.g., `7d`)
- Longer for convenience (e.g., `180d`)

### `CORS_ORIGIN`

- **Required**: ✅ Yes
- **Default**: `https://${DOMAIN}`
- **Must Change**: ⚠️ Only if using subdomain
- **Description**: Allowed origin for CORS requests
- **Format**: `https://your-domain.com` (no trailing slash)

**When to Change**:
- If frontend is on different subdomain than API
- Example: Frontend on `app.example.com`, API on `api.example.com`

---

## LiveKit Configuration

### `LIVEKIT_API_KEY`

- **Required**: ✅ Yes
- **Default**: `APIxxxxxxxxxxxxxxxx`
- **Must Change**: ✅ **YES - CRITICAL**
- **Description**: LiveKit API key for authentication
- **Security**: Random string (16-32 characters)
- **Generate**: `openssl rand -hex 16`

**Example**:
```bash
LIVEKIT_API_KEY=API7a8b9c0d1e2f3g4h
```

### `LIVEKIT_API_SECRET`

- **Required**: ✅ Yes
- **Default**: `change_this_to_a_very_long_random_secret`
- **Must Change**: ✅ **YES - CRITICAL**
- **Description**: LiveKit API secret for token signing
- **Security**: Minimum 32 characters, random string
- **Generate**: `openssl rand -base64 32`

**Example**:
```bash
LIVEKIT_API_SECRET=9mK2pL5vN8qR1wT4yU7iO0aS3dF6gH9jK2lM5nB8vC1xZ
```

**Important Notes**:
- Must match in LiveKit configuration file (`livekit/livekit.yaml`)
- Keep secret and secure

### `LIVEKIT_URL`

- **Required**: ✅ Yes
- **Default**: `ws://livekit:7880`
- **Must Change**: ❌ No (internal URL)
- **Description**: Internal LiveKit server URL (for API)
- **Format**: `ws://livekit:7880` (Docker service name)

### `LIVEKIT_PUBLIC_URL`

- **Required**: ✅ Yes
- **Default**: `wss://${DOMAIN}/livekit`
- **Must Change**: ❌ No (auto-generated)
- **Description**: Public LiveKit WebSocket URL (for frontend)
- **Format**: `wss://your-domain.com/livekit`

**When to Change**:
- If using external reverse proxy with different path
- If LiveKit is on separate subdomain

---

## CoTURN Configuration

### `COTURN_REALM`

- **Required**: ✅ Yes
- **Default**: `${DOMAIN}`
- **Must Change**: ❌ No (auto-generated)
- **Description**: TURN server realm (usually your domain)

### `COTURN_USER`

- **Required**: ✅ Yes
- **Default**: `svazuser`
- **Must Change**: ❌ No (can leave default)
- **Description**: TURN server username

### `COTURN_PASSWORD`

- **Required**: ✅ Yes
- **Default**: `change_this_secure_coturn_password`
- **Must Change**: ✅ **YES - CRITICAL**
- **Description**: TURN server password (shared secret for generating temporary credentials)
- **Security**: Strong, random password
- **Generate**: `openssl rand -base64 32`

**Example**:
```bash
COTURN_PASSWORD=5mK8pL1vN4qR7wT0yU3iO6aS9dF2gH5jK8lM1nB4vC7xZ
```

**Important Notes**:
- This password is used by the API to generate temporary TURN credentials
- Clients never see this password - they receive time-limited credentials from `/api/turn-credentials` endpoint
- Credentials are valid for 1 hour by default

### `COTURN_LISTENING_PORT`

- **Required**: ✅ Yes
- **Default**: `3478`
- **Must Change**: ⚠️ Only if port blocked
- **Description**: STUN/TURN listening port
- **Standard**: `3478` (IETF standard)

**When to Change**:
- If port 3478 is blocked by firewall
- If port is already in use

**Important**: If changed, also update `NEXT_PUBLIC_STUN_URL` and `NEXT_PUBLIC_TURN_URL`

### `COTURN_TLS_LISTENING_PORT`

- **Required**: ❌ No
- **Default**: `5349`
- **Must Change**: ❌ No
- **Description**: TURNS (STUN/TURN over TLS) port
- **Standard**: `5349` (IETF standard)

### `COTURN_MIN_PORT` / `COTURN_MAX_PORT`

- **Required**: ✅ Yes
- **Default**: `49152` / `65535`
- **Must Change**: ⚠️ Only if port range blocked
- **Description**: UDP port range for TURN media relay
- **Range**: Minimum ~1000 ports recommended

**When to Change**:
- If firewall blocks high ports
- To reduce port range (e.g., `50000-51000`)

**Example** (reduced range):
```bash
COTURN_MIN_PORT=50000
COTURN_MAX_PORT=51000  # 1000 ports (enough for ~500 concurrent calls)
```

---

## Frontend Configuration

### `FRONTEND_PORT`

- **Required**: ✅ Yes
- **Default**: `3000`
- **Must Change**: ❌ No (internal port)
- **Description**: Internal port for Next.js frontend

### `NEXT_PUBLIC_API_URL`

- **Required**: ✅ Yes
- **Default**: `https://${DOMAIN}/api`
- **Must Change**: ❌ No (auto-generated)
- **Description**: Public API URL for frontend
- **Format**: `https://your-domain.com/api`

### `NEXT_PUBLIC_SOCKET_URL`

- **Required**: ✅ Yes
- **Default**: `https://${DOMAIN}`
- **Must Change**: ❌ No (auto-generated)
- **Description**: Socket.io server URL
- **Format**: `https://your-domain.com`

### `NEXT_PUBLIC_LIVEKIT_URL`

- **Required**: ✅ Yes
- **Default**: `wss://${DOMAIN}/livekit`
- **Must Change**: ❌ No (auto-generated)
- **Description**: LiveKit WebSocket URL for frontend
- **Format**: `wss://your-domain.com/livekit`

### `NEXT_PUBLIC_STUN_URL`

- **Required**: ✅ Yes
- **Default**: `stun:${DOMAIN}:3478`
- **Must Change**: ⚠️ Only if COTURN port changed
- **Description**: STUN server URL for WebRTC
- **Format**: `stun:your-domain.com:3478`

### `NEXT_PUBLIC_TURN_URL`

- **Required**: ✅ Yes
- **Default**: `turn:${DOMAIN}:3478`
- **Must Change**: ⚠️ Only if COTURN port changed
- **Description**: TURN server URL for WebRTC
- **Format**: `turn:your-domain.com:3478`

### `NEXT_PUBLIC_WEBTORRENT_TRACKERS`

- **Required**: ✅ Yes
- **Default**: `wss://tracker.openwebtorrent.com,wss://tracker.btorrent.xyz`
- **Must Change**: ❌ No (public trackers)
- **Description**: WebTorrent trackers for P2P Emergency Mode
- **Format**: Comma-separated list of WebSocket tracker URLs

**When to Change**:
- If you want to use private trackers
- If public trackers are blocked

---

## Caddy Configuration

### `CADDY_ADMIN_PORT`

- **Required**: ✅ Yes
- **Default**: `2019`
- **Must Change**: ❌ No (internal port)
- **Description**: Caddy admin API port (not exposed)

---

## Security Configuration

### `RATE_LIMIT_MAX`

- **Required**: ✅ Yes
- **Default**: `100`
- **Must Change**: ⚠️ Based on needs
- **Description**: Maximum requests per window
- **Recommended**: `100` for normal use, `50` for stricter limits

### `RATE_LIMIT_WINDOW`

- **Required**: ✅ Yes
- **Default**: `15m`
- **Must Change**: ❌ No
- **Description**: Rate limit time window
- **Format**: `<number><unit>` (e.g., `15m`, `1h`)

### `SESSION_SECRET`

- **Required**: ✅ Yes
- **Default**: `change_this_to_another_very_long_random_string`
- **Must Change**: ✅ **YES - CRITICAL**
- **Description**: Secret for session encryption
- **Security**: Minimum 32 characters, random string
- **Generate**: `openssl rand -base64 32`

**Example**:
```bash
SESSION_SECRET=3mK6pL9vN2qR5wT8yU1iO4aS7dF0gH3jK6lM9nB2vC5xZ
```

---

## Logging Configuration

### `LOG_LEVEL`

- **Required**: ✅ Yes
- **Default**: `info`
- **Must Change**: ❌ No
- **Description**: Logging verbosity level
- **Allowed Values**: `error`, `warn`, `info`, `debug`

**When to Change**:
- `debug` for troubleshooting (verbose)
- `warn` or `error` for production (less verbose)

---

## Generating Secure Secrets

### Using OpenSSL (Recommended)

```bash
# Generate 32-character base64 string (for most secrets)
openssl rand -base64 32

# Generate 16-character hex string (for LiveKit API key)
openssl rand -hex 16

# Generate 64-character base64 string (extra secure)
openssl rand -base64 64
```

### Using Node.js

```bash
# Generate random string
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Using Python

```bash
# Generate random string
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Online Tools (Use with Caution)

- [RandomKeygen](https://randomkeygen.com/) - Generate random keys
- [1Password Password Generator](https://1password.com/password-generator/)

**Security Warning**: For production, always generate secrets locally, never use online tools for critical secrets.

---

## Complete Example `.env` File

```bash
# Domain Configuration
DOMAIN=svaz.app
SSL_EMAIL=admin@svaz.app

# Database
POSTGRES_USER=svazapp
POSTGRES_PASSWORD=xK9mP2vL8nQ4wR7tY6uI3oP5aS1dF0gH2jK4lM6nB8vC
POSTGRES_DB=svazapp
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}

# API
NODE_ENV=production
API_PORT=8080
JWT_SECRET=7mK9pL2vN8qR4wT6yU3iO5aS1dF0gH2jK4lM6nB8vC9xZ
JWT_EXPIRES_IN=90d
CORS_ORIGIN=https://${DOMAIN}

# LiveKit
LIVEKIT_API_KEY=API7a8b9c0d1e2f3g4h
LIVEKIT_API_SECRET=9mK2pL5vN8qR1wT4yU7iO0aS3dF6gH9jK2lM5nB8vC1xZ
LIVEKIT_URL=ws://livekit:7880
LIVEKIT_PUBLIC_URL=wss://${DOMAIN}/livekit

# CoTURN
COTURN_REALM=${DOMAIN}
COTURN_USER=svazuser
COTURN_PASSWORD=5mK8pL1vN4qR7wT0yU3iO6aS9dF2gH5jK8lM1nB4vC7xZ
COTURN_LISTENING_PORT=3478
COTURN_TLS_LISTENING_PORT=5349
COTURN_MIN_PORT=49152
COTURN_MAX_PORT=65535

# Frontend
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
NEXT_PUBLIC_SOCKET_URL=https://${DOMAIN}
NEXT_PUBLIC_LIVEKIT_URL=wss://${DOMAIN}/livekit
NEXT_PUBLIC_STUN_URL=stun:${DOMAIN}:3478
NEXT_PUBLIC_TURN_URL=turn:${DOMAIN}:3478
NEXT_PUBLIC_WEBTORRENT_TRACKERS=wss://tracker.openwebtorrent.com,wss://tracker.btorrent.xyz

# Caddy
CADDY_ADMIN_PORT=2019

# Security
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15m
SESSION_SECRET=3mK6pL9vN2qR5wT8yU1iO4aS7dF0gH3jK6lM9nB2vC5xZ

# Logging
LOG_LEVEL=info
```

---

## Validation Checklist

Before deploying, verify:

- [ ] `DOMAIN` is set to your actual domain
- [ ] `SSL_EMAIL` is set to your email
- [ ] All passwords are changed from defaults
- [ ] All secrets are at least 32 characters
- [ ] `POSTGRES_PASSWORD` matches in `DATABASE_URL`
- [ ] `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` match in `livekit/livekit.yaml`
- [ ] `CORS_ORIGIN` matches your domain
- [ ] All `NEXT_PUBLIC_*` URLs use correct domain
- [ ] `.env` file is NOT committed to git

---

For more information, see:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [PORTS.md](./PORTS.md) - Port configuration
- [README.md](./README.md) - Project overview

