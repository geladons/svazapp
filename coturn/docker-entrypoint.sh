#!/bin/sh
# =============================================================================
# Docker Entrypoint Script for CoTURN Service
# =============================================================================
# This script detects external IP and configures CoTURN before starting
# =============================================================================

set -e

echo "========================================="
echo "COTURN - Starting..."
echo "========================================="

# Detect external IP
if [ "$DETECT_EXTERNAL_IP" = "yes" ]; then
  echo "🔍 Detecting external IP address..."
  
  # Try multiple services to detect external IP
  EXTERNAL_IP=$(curl -s -4 https://api.ipify.org 2>/dev/null || \
                curl -s -4 https://ifconfig.me 2>/dev/null || \
                curl -s -4 https://icanhazip.com 2>/dev/null || \
                echo "")
  
  if [ -n "$EXTERNAL_IP" ]; then
    echo "✅ Detected external IP: $EXTERNAL_IP"
    export EXTERNAL_IP
  else
    echo "⚠️  Could not detect external IP, using container IP"
    EXTERNAL_IP=$(hostname -i | awk '{print $1}')
    export EXTERNAL_IP
  fi
else
  echo "ℹ️  External IP detection disabled"
  EXTERNAL_IP=$(hostname -i | awk '{print $1}')
  export EXTERNAL_IP
fi

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

# Generate turnserver.conf with detected IPs
echo "📝 Generating turnserver.conf with detected IPs..."

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

echo "✅ Configuration generated successfully!"
echo ""
echo "========================================="
echo "CoTURN Configuration:"
echo "  External IP: $EXTERNAL_IP"
echo "  Relay IP: $RELAY_IP"
echo "  Realm: ${REALM:-svaz.app}"
echo "  User: ${USERNAME:-svazuser}"
echo "  Listening Port: ${MIN_PORT:-3478}"
echo "  Port Range: ${MIN_PORT:-49152}-${MAX_PORT:-65535}"
echo "========================================="
echo ""

# Start CoTURN
echo "🚀 Starting CoTURN server..."
exec turnserver -c /etc/coturn/turnserver.conf

