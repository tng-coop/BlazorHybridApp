#!/bin/bash
# Determine the script's directory
scriptdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dotnet tool restore
set -e

# Create logs directory if it doesn't exist
mkdir -p logs
LOGFILE="$scriptdir/../logs/aspnet-server-log-$(date +"%Y%m%d-%H%M%S").log"

cleanup() {
    EXIT_CODE=${1:-0}
    echo "🛑 Stopping ASP.NET Core server..."
    if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" &>/dev/null; then
        kill -SIGTERM "$SERVER_PID"
        wait "$SERVER_PID"
        echo "✅ Server stopped gracefully."
    fi
    exit $EXIT_CODE
}

# Trap interrupt signals (Ctrl+C and termination)
trap cleanup SIGINT SIGTERM

# Validate required files
cd "$scriptdir/../BlazorWebApp"
for file in Program.cs *.csproj Properties/launchSettings.json appsettings.Development.json; do
  [[ -f "$file" ]] || { echo "❌ Required file '$file' missing."; exit 1; }
done

# Reset the database
chmod +x "$scriptdir/reset-db.sh"
"$scriptdir/reset-db.sh"

# Run xUnit tests explicitly before starting the app
cd "$scriptdir/../BlazorWebApp.Tests"
if dotnet test; then
    echo "✅ xUnit tests passed."
else
    echo "❌ xUnit tests failed."
    cleanup 1
fi

cd "$scriptdir/../BlazorWebApp"

# ─── Determine APP_URL from env-var or user-secrets (or fail) ───
if [ -n "$Kestrel__Endpoints__Https__Url" ]; then
    # env-var takes precedence
    APP_URL="$Kestrel__Endpoints__Https__Url"
elif SECRET_LINE=$(dotnet user-secrets list | grep '^Kestrel:Endpoints:Https:Url ' || true) && [ -n "$SECRET_LINE" ]; then
    # parse "Key = Value" from user-secrets
    APP_URL=$(printf "%s" "$SECRET_LINE" | cut -d '=' -f2- | sed 's/^ *//')
else
    echo "❌ Neither env-var Kestrel__Endpoints__Https__Url nor user-secret Kestrel:Endpoints:Https:Url is set."
    exit 1
fi

# Extract port number
APP_PORT=${APP_URL##*:}

# Export for ASP.NET Core and Playwright
export Kestrel__Endpoints__Https__Url="$APP_URL"
export PLAYWRIGHT_BASE_URL="$APP_URL"

# Kill any existing process listening on that port
existing_pid=$(lsof -t -i:"$APP_PORT" || true)
if [ -n "$existing_pid" ]; then
    kill -SIGTERM "$existing_pid"
    TIMEOUT=10
    while kill -0 "$existing_pid" &>/dev/null && [ $TIMEOUT -gt 0 ]; do
        echo "Waiting for graceful shutdown..."
        sleep 1
        ((TIMEOUT--))
    done
    kill -9 "$existing_pid" &>/dev/null || true
    echo "✅ Existing server terminated."
fi

# Start ASP.NET Core app (logs only to file)
dotnet run > "$LOGFILE" 2>&1 &
SERVER_PID=$!

# Wait for server to be ready (HTTPS)
TIMEOUT=40
until curl -fsSL --cacert "/srv/shared/aspnet/cert/aspnet.lan-ca.crt" "$APP_URL" &>/dev/null || [ $TIMEOUT -le 0 ]; do
    echo "Waiting for server to start..."
    sleep 1
    ((TIMEOUT--))
done

if [ $TIMEOUT -le 0 ]; then
    echo "❌ Server failed to start."
    cleanup 1
fi

echo "✅ Server running on $APP_URL"

# ─── Determine HTTP URL from env-var or user-secrets (or fail) ───
if [ -n "$Kestrel__Endpoints__Http__Url" ]; then
    APP_URL_HTTP="$Kestrel__Endpoints__Http__Url"
elif SECRET_LINE=$(dotnet user-secrets list | grep '^Kestrel:Endpoints:Http:Url ' || true) && [ -n "$SECRET_LINE" ]; then
    APP_URL_HTTP=$(printf "%s" "$SECRET_LINE" | cut -d '=' -f2- | sed 's/^ *//')
else
    echo "❌ Neither env-var Kestrel__Endpoints__Http__Url nor user-secret Kestrel:Endpoints:Http:Url is set."
    cleanup 1
fi

# ─── Smoke-test HTTP /cert endpoint ───
CERT_URL="$APP_URL_HTTP/cert"
TIMEOUT=20
until curl --fail --silent "$CERT_URL" > /dev/null || [ $TIMEOUT -le 0 ]; do
    echo "Waiting for HTTP cert endpoint at $CERT_URL…"
    sleep 1
    ((TIMEOUT--))
done

if [ $TIMEOUT -le 0 ]; then
    echo "❌ HTTP cert endpoint failed at $CERT_URL"
    cleanup 1
fi

echo "✅ HTTP cert endpoint reachable at $CERT_URL"

# Install frontend dependencies
cd "$scriptdir"
npm ci

# Smoke-test the Swagger UI
output=$("$scriptdir/fetch-html.sh" "$APP_URL")

# something was captured
if [ -z "$output" ]; then
  echo "❌ nothing was captured."
  cleanup 1
fi

echo "✅ something is displayed OK."

# --- Run Playwright tests ---
cd "$scriptdir/../PlaywrightTests"
# npx playwright install chromium --with-deps

if npx playwright test; then
    echo "✅ Playwright tests passed."
    cleanup 0
else
    echo "❌ Playwright tests failed."
    cleanup 1
fi
