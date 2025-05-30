#!/usr/bin/env bash
scriptdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
set -euo pipefail  # Strict error handling

# --- Check for required environment variables ---
: "${NEON_HOST:?NEON_HOST is required}"
: "${NEON_DB:?NEON_DB is required}"
: "${NEON_USER:?NEON_USER is required}"
: "${NEON_PASSWORD:?NEON_PASSWORD is required}"

# --- Helper function to run SQL commands ---
run_psql() {
  PGPASSWORD="$NEON_PASSWORD" psql -X -A -t \
    --host="$NEON_HOST" \
    --username="$NEON_USER" \
    -c "$1" "$NEON_DB" \
    -p 5432 \
    --set=sslmode=require
}

# --- Clear existing Neon DB ---
echo "🔄 Clearing existing Neon database..."
run_psql "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" || {
  echo "⚠️ Schema reset encountered an issue but continuing."
}

# --- Apply EF migrations ---
echo "🔄 Applying EF migrations to Neon..."
cd "$scriptdir/../BlazorWebApp"
dotnet ef database update --connection "Host=$NEON_HOST;Database=$NEON_DB;Username=$NEON_USER;Password=$NEON_PASSWORD;Ssl Mode=Require;Trust Server Certificate=true;"

echo "🚀 Neon database published and seeded successfully!"
