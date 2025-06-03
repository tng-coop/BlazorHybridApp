#!/usr/bin/env bash
# Determine the script's directory
scriptdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

set -e  # Exit on error

$scriptdir/clear-db.sh

# Remove old migrations (handle both legacy and current paths)
for migdir in "$scriptdir/../BlazorHybridApp/Migrations" \
               "$scriptdir/../BlazorHybridApp/Data/Migrations"; do
  if [ -d "$migdir" ]; then
    rm -rf "$migdir"
    echo "✅ Removed migrations directory: $(basename "$migdir")"
  fi
done
cd $scriptdir/../BlazorHybridApp
# Create new migration
dotnet ef migrations add InitialCreate
echo "✅ New migration created."

# Apply new migration to database
dotnet ef database update
echo "✅ Database updated with new migrations."

echo -e "\n✅ Database and migrations fully reset and ready!"
