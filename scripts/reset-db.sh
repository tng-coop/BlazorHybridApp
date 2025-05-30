#!/usr/bin/env bash

# Determine the script's directory
scriptdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

set -e  # Exit on error


# Run the clearing script
$scriptdir/clear-db.sh

cd $scriptdir/../BlazorWebApp
# Apply Entity Framework migrations
dotnet ef database update

echo -e "\n✅ Database reset, seeded, and ready for ASP.NET Entity Framework!"
