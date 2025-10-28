#!/bin/sh
# =============================================================================
# Docker Entrypoint Script for API Service
# =============================================================================
# This script runs before the main application starts.
# It ensures database migrations are applied before starting the server.
# =============================================================================

set -e

echo "========================================="
echo "SVAZ.APP API - Starting..."
echo "========================================="

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."

# Extract database host and port from DATABASE_URL
# Format: postgresql://user:password@host:port/database
# More robust parsing with fallback
if [ -n "$DATABASE_URL" ]; then
  # Extract host (everything between @ and :)
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:\/]*\).*/\1/p')

  # Extract port (number after host: and before /)
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]\{1,5\}\)\/.*/\1/p')

  # Fallback to defaults if extraction failed
  if [ -z "$DB_HOST" ]; then
    echo "⚠️  Could not parse DB_HOST from DATABASE_URL, using default: db"
    DB_HOST="db"
  fi

  if [ -z "$DB_PORT" ]; then
    echo "⚠️  Could not parse DB_PORT from DATABASE_URL, using default: 5432"
    DB_PORT="5432"
  fi
else
  echo "⚠️  DATABASE_URL not set, using defaults"
  DB_HOST="db"
  DB_PORT="5432"
fi

echo "ℹ️  Database: $DB_HOST:$DB_PORT"

# Wait for database TCP connection (with timeout)
MAX_RETRIES=30
RETRY_COUNT=0

echo "⏳ Waiting for database at $DB_HOST:$DB_PORT..."

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  # Use timeout to prevent nc from hanging indefinitely
  # -w 2 = wait max 2 seconds for connection
  if timeout 3 nc -z -w 2 "$DB_HOST" "$DB_PORT" 2>/dev/null; then
    echo "✅ Database is ready!"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))

  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "❌ Database is still unavailable after $MAX_RETRIES attempts (60 seconds)"
    echo "❌ DATABASE_URL: $DATABASE_URL"
    echo "❌ Parsed DB_HOST: $DB_HOST"
    echo "❌ Parsed DB_PORT: $DB_PORT"
    echo ""
    echo "Possible causes:"
    echo "  1. Database container is not running"
    echo "  2. Docker network is broken (check iptables/UFW)"
    echo "  3. DATABASE_URL is incorrect"
    echo ""
    echo "Debug commands:"
    echo "  docker compose ps"
    echo "  docker compose logs db"
    echo "  sudo iptables -L DOCKER-USER -n"
    exit 1
  fi

  echo "⏳ Database unavailable - retrying in 2 seconds... (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

# Run database migrations
echo "🔄 Running database migrations..."

if npx prisma migrate deploy; then
  echo "✅ Migrations applied successfully!"
else
  echo "❌ Failed to apply database migrations"
  echo "❌ This usually means:"
  echo "   - Database connection failed"
  echo "   - Migration files are corrupted"
  echo "   - Database user lacks permissions"
  echo ""
  echo "DATABASE_URL: $DATABASE_URL"
  exit 1
fi

# Start the application
echo "🚀 Starting API server..."
echo "========================================="
exec node dist/server.js

