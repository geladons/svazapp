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
until npx prisma db push --skip-generate 2>/dev/null || npx prisma migrate status 2>/dev/null; do
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

