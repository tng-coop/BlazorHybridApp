#!/usr/bin/env bash
set -e

#set scriptdir
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../BlazorWebApp" || exit 1

# A script to generate 10 plasma-based fractal images named fractal_0.png through fractal_9.png

# Install ImageMagick if it's not already available
if ! command -v convert &> /dev/null; then
  echo "ImageMagick not found. Installing..."
  if [[ -x "$(command -v apt-get)" ]]; then
    sudo apt-get update && sudo apt-get install -y imagemagick
  elif [[ -x "$(command -v yum)" ]]; then
    sudo yum install -y imagemagick
  else
    echo "Package manager not recognized. Please install ImageMagick manually." >&2
    exit 1
  fi
fi

# Output directory for fractal images
OUT_DIR="wwwroot/images/fractals"
mkdir -p "$OUT_DIR"

# Generate 10 fractal images
for i in $(seq 0 9); do
  echo "Generating fractal image #$i..."
  convert -size 1024x1024 plasma:fractal "$OUT_DIR/fractal_${i}.png"
done

echo "All fractal images generated in $OUT_DIR."
