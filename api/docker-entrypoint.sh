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
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

echo "ℹ️  Database: $DB_HOST:$DB_PORT"

# Wait for database TCP connection
until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  echo "⏳ Database is unavailable - sleeping for 2 seconds..."
  sleep 2
done

echo "✅ Database is ready!"

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "✅ Migrations applied successfully!"

# Start the application
echo "🚀 Starting API server..."
exec node dist/server.js

