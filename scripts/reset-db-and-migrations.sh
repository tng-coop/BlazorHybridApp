#!/usr/bin/env bash
# Determine the script's directory
scriptdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

set -e  # Exit on error

$scriptdir/clear-db.sh

# Remove old migrations (EF migrations live under Data/Migrations)
if [ -d "$scriptdir/../BlazorHybridApp/Data/Migrations" ]; then
  rm -rf "$scriptdir/../BlazorHybridApp/Data/Migrations"
  echo "✅ Old migrations directory removed."
fi
cd $scriptdir/../BlazorHybridApp
# Create new migration
dotnet ef migrations add InitialCreate
echo "✅ New migration created."

# Apply new migration to database
dotnet ef database update
echo "✅ Database updated with new migrations."

echo -e "\n✅ Database and migrations fully reset and ready!"
