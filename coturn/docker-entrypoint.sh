#!/bin/sh
# =============================================================================
# Docker Entrypoint Script for CoTURN Service
# =============================================================================
# This script detects external IP, configures SSL certificates,
# and generates CoTURN configuration before starting the server.
# =============================================================================

set -e

echo "========================================="
echo "COTURN - Starting..."
echo "========================================="

# Determine deployment scenario
SCENARIO="${DEPLOYMENT_SCENARIO:-standalone}"
echo "ℹ️  Deployment scenario: $SCENARIO"
echo ""

# Detect external IP
# Priority: 1) EXTERNAL_IP env var, 2) Auto-detection, 3) Container IP
if [ -n "$EXTERNAL_IP" ] && [ "$EXTERNAL_IP" != "0.0.0.0" ]; then
  echo "✅ Using EXTERNAL_IP from environment: $EXTERNAL_IP"
elif [ "$DETECT_EXTERNAL_IP" = "yes" ]; then
  echo "🔍 Detecting external IP address..."

  # Use Cloudflare trace API with direct IP (no DNS required)
  # This is more reliable than domain-based services
  DETECTED_IP=$(timeout 3 curl -s -4 --connect-timeout 2 --max-time 3 http://1.1.1.1/cdn-cgi/trace 2>/dev/null | grep -oP 'ip=\K[0-9.]+' || echo "")

  # Fallback to domain-based services if Cloudflare fails
  if [ -z "$DETECTED_IP" ]; then
    echo "⏳ Cloudflare trace failed, trying domain-based services..."
    DETECTED_IP=$(timeout 3 curl -s -4 --connect-timeout 2 --max-time 3 https://api.ipify.org 2>/dev/null || \
                  timeout 3 curl -s -4 --connect-timeout 2 --max-time 3 https://ifconfig.me 2>/dev/null || \
                  echo "")
  fi

  if [ -n "$DETECTED_IP" ]; then
    echo "✅ Detected external IP: $DETECTED_IP"
    EXTERNAL_IP="$DETECTED_IP"
  else
    echo "⚠️  Could not detect external IP from internet services"
    echo "⚠️  This may cause TURN to not work properly through NAT"
    echo "⚠️  Using container IP as fallback: $(hostname -i | awk '{print $1}')"
    echo "⚠️  Consider setting EXTERNAL_IP environment variable"
    EXTERNAL_IP=$(hostname -i | awk '{print $1}')
  fi
else
  echo "ℹ️  External IP detection disabled, using container IP"
  EXTERNAL_IP=$(hostname -i | awk '{print $1}')
fi

export EXTERNAL_IP

# Detect relay IP (same as external IP in most cases)
if [ "$DETECT_RELAY_IP" = "yes" ]; then
  RELAY_IP="$EXTERNAL_IP"
  export RELAY_IP
  echo "✅ Relay IP set to: $RELAY_IP"
else
  RELAY_IP=$(hostname -i | awk '{print $1}')
  export RELAY_IP
  echo "ℹ️  Relay IP set to container IP: $RELAY_IP"
fi

# =============================================================================
# SSL/TLS Certificate Configuration
# =============================================================================

CERT_FILE=""
KEY_FILE=""
TLS_ENABLED=false

if [ "$SCENARIO" = "standalone" ]; then
  echo "🔐 Configuring SSL certificates (Scenario A: Standalone with Caddy)..."

  # Wait for Caddy to obtain SSL certificates
  CERT_PATH="/caddy-data/certificates/acme-v02.api.letsencrypt.org-directory/${DOMAIN}/${DOMAIN}.crt"
  KEY_PATH="/caddy-data/certificates/acme-v02.api.letsencrypt.org-directory/${DOMAIN}/${DOMAIN}.key"

  echo "⏳ Waiting for Caddy SSL certificates..."
  echo "   Certificate: $CERT_PATH"
  echo "   Key: $KEY_PATH"
  echo ""
  echo "   This may take 1-2 minutes for Caddy to obtain certificates from Let's Encrypt..."
  echo "   If DNS is not configured correctly, this will timeout after 2 minutes."
  echo ""

  # Wait up to 2 minutes (24 iterations * 5 seconds)
  for i in $(seq 1 24); do
    if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
      echo "✅ Caddy SSL certificates found!"
      CERT_FILE="$CERT_PATH"
      KEY_FILE="$KEY_PATH"
      TLS_ENABLED=true
      break
    fi

    if [ $((i % 6)) -eq 0 ]; then
      echo "⏳ Still waiting for certificates... ($((i * 5)) seconds elapsed)"
    fi

    sleep 5
  done

  if [ "$TLS_ENABLED" = false ]; then
    echo ""
    echo "⚠️  WARNING: SSL certificates not found after 2 minutes"
    echo "⚠️  TURNS (port 5349) will NOT work without certificates"
    echo "⚠️  CoTURN will start with STUN/TURN only (port 3478)"
    echo ""
    echo "   Possible reasons:"
    echo "   - DNS A record for $DOMAIN is not pointing to this server"
    echo "   - Port 80 is not accessible (required for Let's Encrypt validation)"
    echo "   - Let's Encrypt rate limit exceeded (5 certs/week per domain)"
    echo ""
    echo "   Check Caddy logs: docker compose logs caddy"
    echo ""
  fi

elif [ "$SCENARIO" = "external-proxy" ]; then
  echo "🔐 Configuring SSL certificates (Scenario B: External Reverse Proxy)..."

  # Check for user-provided certificates
  USER_CERT="/etc/coturn/certs/fullchain.pem"
  USER_KEY="/etc/coturn/certs/privkey.pem"

  if [ -f "$USER_CERT" ] && [ -f "$USER_KEY" ]; then
    echo "✅ User-provided SSL certificates found!"
    CERT_FILE="$USER_CERT"
    KEY_FILE="$USER_KEY"
    TLS_ENABLED=true
  else
    echo "⚠️  WARNING: No SSL certificates found in /etc/coturn/certs/"
    echo "⚠️  Expected files:"
    echo "     - fullchain.pem (certificate chain)"
    echo "     - privkey.pem (private key)"
    echo ""
    echo "⚠️  TURNS (port 5349) will NOT work without certificates"
    echo "⚠️  CoTURN will start with STUN/TURN only (port 3478)"
    echo ""
    echo "📖 See DEPLOYMENT.md for instructions on obtaining SSL certificates"
  fi
fi

echo ""

# =============================================================================
# Generate CoTURN Configuration
# =============================================================================

# Export variables for envsubst
export COTURN_MIN_PORT="${MIN_PORT:-49152}"
export COTURN_MAX_PORT="${MAX_PORT:-65535}"
export COTURN_REALM="${REALM:-svaz.app}"
export COTURN_USER="${USERNAME:-svazuser}"
export COTURN_PASSWORD="${PASSWORD:-changeme}"

# Generate CoTURN configuration from template using envsubst
envsubst < /etc/coturn/turnserver.conf.template > /etc/coturn/turnserver.conf

cat > /etc/coturn/turnserver.conf << EOF
# =============================================================================
# COTURN SERVER CONFIGURATION (Auto-generated)
# =============================================================================

# Listening port for STUN/TURN
listening-port=3478

# TLS listening port
tls-listening-port=5349

# Listening IP (all interfaces)
listening-ip=0.0.0.0

# External IP (detected)
external-ip=$EXTERNAL_IP

# Relay IP (detected)
relay-ip=$RELAY_IP

# Relay port range
min-port=${MIN_PORT:-49152}
max-port=${MAX_PORT:-65535}

# Enable verbose logging
verbose

# Use fingerprints in TURN messages
fingerprint

# Use long-term credentials mechanism
lt-cred-mech

# Realm for authentication
realm=${REALM:-svaz.app}

# Static user credentials
user=${USERNAME:-svazuser}:${PASSWORD:-changeme}

# Total quota (bytes per allocation)
total-quota=100

# Max bandwidth per allocation (bytes per second)
bps-capacity=0

# Enable STUN
stun-only=false

# Disable multicast peers
no-multicast-peers

# Disable loopback peers
no-loopback-peers

# Enable mobility
mobility

# Disable CLI
no-cli

# Process limits
max-allocate-lifetime=3600
channel-lifetime=600
permission-lifetime=300

# Security - deny private IP ranges
denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255

# Logging
log-file=stdout
syslog

# Disable software attribute in STUN messages
no-software-attribute
EOF

# Add SSL/TLS configuration if certificates are available
if [ "$TLS_ENABLED" = true ]; then
  echo "" >> /etc/coturn/turnserver.conf
  echo "# ==============================================================================" >> /etc/coturn/turnserver.conf
  echo "# SSL/TLS Configuration" >> /etc/coturn/turnserver.conf
  echo "# ==============================================================================" >> /etc/coturn/turnserver.conf
  echo "cert=$CERT_FILE" >> /etc/coturn/turnserver.conf
  echo "pkey=$KEY_FILE" >> /etc/coturn/turnserver.conf
  echo "" >> /etc/coturn/turnserver.conf
fi

echo "✅ Configuration generated successfully!"
echo ""
echo "========================================="
echo "CoTURN Configuration:"
echo "  External IP: $EXTERNAL_IP"
echo "  Relay IP: $RELAY_IP"
echo "  Realm: ${REALM:-svaz.app}"
echo "  User: ${USERNAME:-svazuser}"
echo "  Listening Port: 3478 (STUN/TURN)"
echo "  TLS Listening Port: 5349 (TURNS)"
if [ "$TLS_ENABLED" = true ]; then
  echo "  TLS Status: ✅ ENABLED"
  echo "  Certificate: $CERT_FILE"
else
  echo "  TLS Status: ❌ DISABLED (no certificates)"
fi
echo "  Relay Port Range: ${MIN_PORT:-49152}-${MAX_PORT:-65535}"
echo "========================================="
echo ""

# Start CoTURN
echo "🚀 Starting CoTURN server..."
exec turnserver -c /etc/coturn/turnserver.conf

