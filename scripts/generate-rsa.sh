#!/usr/bin/env bash
set -euo pipefail

# Determine the directory this script lives in
scriptdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Shared certificate directory (must match existing layout)
CERT_DIR="/srv/shared/aspnet/cert"
SHARE_GROUP="aspnet"

# Ensure the share group exists and the directory is present
sudo groupadd -f "${SHARE_GROUP}"
sudo mkdir -p "${CERT_DIR}"
sudo chown root:"${SHARE_GROUP}" "${CERT_DIR}"
# Set SGID so new files inherit the aspnet group, and restrict dir to owner+group
sudo chmod 2770 "${CERT_DIR}"

# Generate keys into the shared cert directory
openssl genrsa -out "${CERT_DIR}/jwt_private.pem" 2048
openssl rsa    -in "${CERT_DIR}/jwt_private.pem" -pubout -out "${CERT_DIR}/jwt_public.pem"

# Fix ownership & perms on the new files
sudo chown root:"${SHARE_GROUP}" "${CERT_DIR}/jwt_private.pem" "${CERT_DIR}/jwt_public.pem"
# Private key only readable by owner+group; public key world-readable
sudo chmod 0640 "${CERT_DIR}/jwt_private.pem"
sudo chmod 0644 "${CERT_DIR}/jwt_public.pem"

echo "✅ Generated jwt_private.pem and jwt_public.pem in ${CERT_DIR}"
