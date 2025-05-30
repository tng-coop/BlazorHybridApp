#!/usr/bin/env bash
scriptdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "$1" ]; then
  echo "Usage: $0 <URL>"
  exit 1
fi

# Detect the browser to use
if command -v google-chrome &>/dev/null; then
  BROWSER="google-chrome"
elif command -v chromium &>/dev/null; then
  BROWSER="chromium"
elif [ -x "/usr/bin/chromium" ]; then
  BROWSER="/usr/bin/chromium"
else
  echo "Error: Neither google-chrome nor chromium is installed or found in your PATH."
  exit 1
fi

echo "Using browser: $BROWSER"

# Launch the browser headless with debugging enabled
"$BROWSER" --headless --remote-debugging-port=9222 >/dev/null 2>&1 &
BROWSER_PID=$!

cleanup() {
  echo "Stopping browser (PID $BROWSER_PID)..."
  kill $BROWSER_PID >/dev/null 2>&1
}

trap cleanup EXIT INT TERM

# Wait until browser debugging port is ready
until curl -s http://localhost:9222/json/version >/dev/null 2>&1; do
  sleep 0.1
done

node "$scriptdir/fetch-html.mjs" "$1"
