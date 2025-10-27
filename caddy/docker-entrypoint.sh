#!/bin/sh
# =============================================================================
# Docker Entrypoint Script for Caddy Service
# =============================================================================
# This script generates production Caddyfile with SSL or uses default config
# for local development based on environment variables.
# =============================================================================

set -e

echo "========================================="
echo "CADDY - Starting..."
echo "========================================="

# Check if DOMAIN and SSL_EMAIL are set (production mode)
if [ -n "$DOMAIN" ] && [ -n "$SSL_EMAIL" ]; then
  echo "🔧 Generating production Caddyfile with SSL..."
  echo "   Domain: $DOMAIN"
  echo "   Email: $SSL_EMAIL"
  
  # Generate Caddyfile from template
  sed "s/{DOMAIN}/$DOMAIN/g; s/{SSL_EMAIL}/$SSL_EMAIL/g" \
    /etc/caddy/Caddyfile.template > /etc/caddy/Caddyfile
  
  echo "✅ Production Caddyfile generated"
  echo "✅ Automatic SSL enabled for: $DOMAIN"
  echo ""
  echo "📝 Caddy will obtain Let's Encrypt certificate automatically"
  echo "   This may take 1-2 minutes on first start..."
else
  echo "ℹ️  Using default Caddyfile (HTTP only)"
  echo "ℹ️  For production, set DOMAIN and SSL_EMAIL environment variables"
fi

echo "========================================="
echo ""

# Start Caddy
echo "🚀 Starting Caddy server..."
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile

