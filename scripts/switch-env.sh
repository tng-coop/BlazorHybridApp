#!/usr/bin/env bash
#
# switch-env.sh — set DB, URLs & user-secrets based on user and env-number

# Navigate to the script directory and into the BlazorWebApp project
scriptdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$scriptdir/../BlazorWebApp" || exit 1

usage() {
  echo "Usage: $0 <env-number 0–9>"
  exit 1
}

# --- validate argument
if [[ $# -ne 1 || ! $1 =~ ^[0-9]$ ]]; then
  usage
fi
ENV_NUM=$1

# --- determine user and port bases
case "$(whoami)" in
  yasu)
    HTTP_BASE=5000
    HTTPS_BASE=5010
    ;;
  akihiko)
    HTTP_BASE=5020
    HTTPS_BASE=5030
    ;;
  *)
    echo "Error: unsupported user '$(whoami)'. Supported: yasu, akihiko."
    exit 1
    ;;
esac

# --- compute ports
HTTP_PORT=$(( HTTP_BASE + ENV_NUM ))
HTTPS_PORT=$(( HTTPS_BASE + ENV_NUM ))

# --- compute and export DB name
NEW_DB="asp-members-$(whoami)-${ENV_NUM}"
export DB_NAME="$NEW_DB"

# --- export new env vars for ASP.NET Core
export ConnectionStrings__DefaultConnection="Host=localhost;Database=${NEW_DB};Username=postgres;Password=postgres"
export Kestrel__Endpoints__Http__Url="http://aspnet.lan:${HTTP_PORT}"
export Kestrel__Endpoints__Https__Url="https://aspnet.lan:${HTTPS_PORT}"

# --- write into user-secrets (run inside the project directory)
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "$ConnectionStrings__DefaultConnection"
dotnet user-secrets set "Kestrel:Endpoints:Http:Url"    "$Kestrel__Endpoints__Http__Url"
dotnet user-secrets set "Kestrel:Endpoints:Https:Url"   "$Kestrel__Endpoints__Https__Url"

# --- feedback
echo "🔄 Configured for:"
echo "   • DB_NAME=$DB_NAME"
echo "   • ConnectionStrings__DefaultConnection=$ConnectionStrings__DefaultConnection"
echo "   • HTTP  URL=$Kestrel__Endpoints__Http__Url"
echo "   • HTTPS URL=$Kestrel__Endpoints__Https__Url"
echo "✅ User secrets updated."
