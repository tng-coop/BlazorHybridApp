#!/usr/bin/env bash
set -euo pipefail

# set scriptdir
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../BlazorWebApp" || exit 1


# db.sh: Dump or restore PostgreSQL databases for local and Neon environments.
# Files are stored under a centralized dump directory with timestamps for uniqueness.
# Dumps exclude ownership and privilege statements for consistent restores.
# Supports optional flags for environment and custom file base.
# Usage:
#   ./db.sh <dump|restore> <local|neon> [-e <env_num>] [-f <file_base>]
# Examples:
#   ./db.sh dump local
#   ./db.sh dump local -e 2
#   ./db.sh dump local -f custom
#   ./db.sh restore neon -f backup_20250507.sql

# ────────────────────────────────────────────────────────────────
# Bail out if any required ENV VARs aren’t set
# ────────────────────────────────────────────────────────────────
: "${NEON_HOST:?Error: NEON_HOST must be set}"
: "${NEON_DB:?Error: NEON_DB must be set}"
: "${NEON_USER:?Error: NEON_USER must be set}"
: "${NEON_PASSWORD:?Error: NEON_PASSWORD must be set}"

function usage() {
  cat <<EOF >&2
Usage:
  $0 <dump|restore> <local|neon> [-e <0-9>] [-f <basename>]

Options:
  -e, --env   <0-9>       environment number (local only)
  -f, --file  <basename>  dump-file base name (default: <DBNAME>_dump)

Examples:
  $0 dump local
  $0 dump local -e 2 -f custom_name
  $0 restore neon -f asp-members_neon_backup.sql
EOF
  exit 1
}

# ────────────────────────────────────────────────────────────────
# 1) Required positional args
# ────────────────────────────────────────────────────────────────
[[ $# -ge 2 ]] || usage
CMD=$1; TARGET=$2; shift 2

# ────────────────────────────────────────────────────────────────
# 2) Parse optional flags
# ────────────────────────────────────────────────────────────────
ENV_NUM=
FILE_BASE=
while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--env)
      ENV_NUM=$2; shift 2;;
    -f|--file)
      FILE_BASE=$2; shift 2;;
    *)
      usage;;
  esac
done

# ────────────────────────────────────────────────────────────────
# 3) Timestamp & dump directory
# ────────────────────────────────────────────────────────────────
time_stamp=$(date +"%Y%m%d_%H%M%S")
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DUMP_DIR="$SCRIPT_DIR/../dumps"
mkdir -p "$DUMP_DIR"

# ────────────────────────────────────────────────────────────────
# 4) Determine connection parameters & defaults
# ────────────────────────────────────────────────────────────────
case "$TARGET" in
  local)
    if [[ -n "$ENV_NUM" ]]; then
      LOCAL_HOST=localhost
      LOCAL_USER=postgres
      LOCAL_PASS=postgres
      DB_NAME="asp-members-${USER}-${ENV_NUM}"
    else
      # pull from user-secrets
      conn=$(dotnet user-secrets list \
        | grep '^ConnectionStrings:DefaultConnection' \
        | sed 's/^.*= //')
      IFS=';' read -ra kv <<<"$conn"
      for pair in "${kv[@]}"; do
        IFS='=' read -r key val <<<"$pair"
        case $key in
          Host)     LOCAL_HOST=$val;;
          Database) DB_NAME=$val;;
          Username) LOCAL_USER=$val;;
          Password) LOCAL_PASS=$val;;
        esac
      done
    fi
    : "${FILE_BASE:=${DB_NAME}_dump}"
    export PGPASSWORD="$LOCAL_PASS"
    ;;

  neon)
    DB_NAME=$NEON_DB
    : "${FILE_BASE:=asp-members_neon_dump}"
    export PGPASSWORD="$NEON_PASSWORD"
    export PGSSLMODE=require
    ;;

  *)
    usage;;
esac

# ────────────────────────────────────────────────────────────────
# 5) Echo current local env number
# ────────────────────────────────────────────────────────────────
if [[ "$TARGET" == local ]]; then
  if [[ -n "$ENV_NUM" ]]; then
    echo "Current local env number: $ENV_NUM"
  else
    # try to regex from DB_NAME
    cur=$(echo "$DB_NAME" | sed -n 's/.*-\([0-9]\)$/\1/p')
    if [[ -n "$cur" ]]; then
      echo "Current local env number: $cur"
    else
      echo "Current local env: default (no number)"
    fi
  fi
fi

# ────────────────────────────────────────────────────────────────
# 6) Build dump/restore filename
# ────────────────────────────────────────────────────────────────
if [[ "$CMD" == dump ]]; then
  DUMP_FILE="$DUMP_DIR/${FILE_BASE}_${time_stamp}.sql"
elif [[ "$CMD" == restore ]]; then
  # use provided FILE_BASE verbatim (with .sql if missing)
  if [[ "$FILE_BASE" == *.sql ]]; then
    fname="$FILE_BASE"
  else
    fname="${FILE_BASE}.sql"
  fi
  DUMP_FILE="$DUMP_DIR/$fname"
else
  usage
fi

# ────────────────────────────────────────────────────────────────
# 7) Summary & execution
# ────────────────────────────────────────────────────────────────
echo "----------------------------------------"
echo "Action:    $CMD"
echo "Target:    $TARGET"
echo "Database:  $DB_NAME"
echo "File:      $DUMP_FILE"
echo "Timestamp: $time_stamp"
echo "----------------------------------------"

case "$CMD" in
  dump)
    echo "Starting dump..."
    if [[ "$TARGET" == local ]]; then
      pg_dump -h "$LOCAL_HOST" -U "$LOCAL_USER" -d "$DB_NAME" -F p -v -O -x > "$DUMP_FILE"
    else
      pg_dump -h "$NEON_HOST" -U "$NEON_USER" -d "$DB_NAME" -F p -v -O -x > "$DUMP_FILE"
    fi
    echo "Dump complete: $DUMP_FILE"
    ;;

  restore)
    echo "Starting restore..."
    if [[ "$TARGET" == local ]]; then
      dropdb -h "$LOCAL_HOST" -U "$LOCAL_USER" "$DB_NAME" || true
      createdb -h "$LOCAL_HOST" -U "$LOCAL_USER" "$DB_NAME"
      psql -h "$LOCAL_HOST" -U "$LOCAL_USER" -d "$DB_NAME" < "$DUMP_FILE"
    else
      conn="postgresql://$NEON_USER:$NEON_PASSWORD@$NEON_HOST/$NEON_DB?sslmode=require"
      psql "$conn" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
      psql "$conn" < "$DUMP_FILE"
    fi
    echo "Restore complete: $DB_NAME"
    ;;

  *)
    usage;;
esac
