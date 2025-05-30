#!/bin/bash

# Load smtp.env if it exists
if [ -f smtp.env ]; then
  set -a
  source smtp.env
  set +a
else
  echo "❌ smtp.env file not found!"
  exit 1
fi

# Check recipient argument
if [ -z "$1" ]; then
  echo "Usage: $0 recipient@example.com"
  exit 1
fi

TO_EMAIL="$1"
SUBJECT="SMTP Test Email"
BODY="This is a test email sent via SMTP with STARTTLS."

# Ensure required environment variables are set
: "${SMTP_SERVER:?SMTP_SERVER required}"
: "${SMTP_PORT:?SMTP_PORT required}"
: "${SMTP_USER:?SMTP_USER required}"
: "${SMTP_PASSWORD:?SMTP_PASSWORD required}"
: "${FROM_EMAIL:?FROM_EMAIL required}"

curl --url "smtp://${SMTP_SERVER}:${SMTP_PORT}" --ssl-reqd \
  --mail-from "${FROM_EMAIL}" \
  --mail-rcpt "${TO_EMAIL}" \
  --upload-file <(echo -e "From: ${FROM_EMAIL}\nTo: ${TO_EMAIL}\nSubject: ${SUBJECT}\n\n${BODY}") \
  --user "${SMTP_USER}:${SMTP_PASSWORD}"
