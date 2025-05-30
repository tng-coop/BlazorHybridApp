#!/usr/bin/env bash
# Navigate to the script directory and into the BlazorWebApp project
scriptdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$scriptdir/../BlazorWebApp" || exit 1
set -e  # Exit on error

# --- Configuration ---
# Allow overriding via environment or user-secrets
DB_NAME=${DB_NAME:-}
DB_USER="postgres"
DB_PASSWORD="postgres" # Development only

# --- Try to extract DB_NAME from user-secrets if not already set ---
if [[ -z "$DB_NAME" ]] && command -v dotnet &>/dev/null; then
  # Pull raw JSON and strip comment wrappers
  raw_json=$(dotnet user-secrets list --json 2>/dev/null | grep -v '^//') || raw_json=""
  if [[ -n "$raw_json" ]]; then
    # Prefer jq if available
    if command -v jq &>/dev/null; then
      conn=$(printf '%s' "$raw_json" | jq -r '."ConnectionStrings:DefaultConnection"') || conn=""
    else
      # Fallback to plain-text list + sed
      conn=$(dotnet user-secrets list 2>/dev/null \
             | grep 'ConnectionStrings:DefaultConnection' \
             | sed -n 's/.*Database=\([^;]*\).*/\1/p') || conn=""
      # If fallback produced the DB name directly, assign and skip regex
      if [[ -n "$conn" ]]; then
        DB_NAME="$conn"
        conn=
      fi
    fi

    # If we got a full connection string, parse out the Database value
    if [[ -n "$conn" && -z "$DB_NAME" ]]; then
      if [[ "$conn" =~ Database=([^;]+) ]]; then
        DB_NAME="${BASH_REMATCH[1]}"
      fi
    fi
  fi
fi

# Fallback to default if still empty
DB_NAME=${DB_NAME:-asp-members}

# Connection parameters
PSQL_HOST="127.0.0.1"
PSQL_PORT="5432"
PSQL_USER="$DB_USER"
PSQL_PASS="$DB_PASSWORD"

# Helper function
run_psql() {
  PGPASSWORD="$PSQL_PASS" psql -X -A -t \
    --host="$PSQL_HOST" \
    --port="$PSQL_PORT" \
    --username="$PSQL_USER" \
    -c "$1" "$2"
}

# Terminate existing connections to database
run_psql "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" postgres

# Drop database
run_psql "DROP DATABASE IF EXISTS \"$DB_NAME\";" postgres

# Create database
run_psql "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";" postgres

# Verify database exists
if [[ "$(run_psql "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" postgres)" == "1" ]]; then
  echo "✓ Database '$DB_NAME' exists."
else
  echo "✗ Database '$DB_NAME' missing!"
  exit 1
fi

echo "✅ Database cleared and recreated successfully."
