#!/bin/bash
# Wrapper script to ensure DATABASE_URL is set before running Prisma commands
# Usage: ./scripts/prisma-with-env.sh db push
#        ./scripts/prisma-with-env.sh generate
#        ./scripts/prisma-with-env.sh migrate dev

cd "$(dirname "$0")/.." || exit 1

# Load .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Build DATABASE_URL from DB_* variables if not set
if [ -z "$DATABASE_URL" ] && [ -n "$DB_HOST" ] && [ -n "$DB_NAME" ] && [ -n "$DB_USER" ]; then
  PASSWORD=$(printf '%s' "$DB_PASSWORD" | jq -sRr @uri 2>/dev/null || echo "$DB_PASSWORD")
  PORT=${DB_PORT:-5432}
  SSL_MODE=""
  if [ "$DB_SSL" = "true" ]; then
    SSL_MODE="?sslmode=require"
  fi
  export DATABASE_URL="postgresql://${DB_USER}:${PASSWORD}@${DB_HOST}:${PORT}/${DB_NAME}${SSL_MODE}"
  echo "✅ Constructed DATABASE_URL from DB_* variables"
  echo "   Host: $DB_HOST"
  echo "   Database: $DB_NAME"
  echo "   User: $DB_USER"
fi

# Run Prisma command with all arguments
npx prisma "$@"

