#!/bin/bash

# Secrets to remove from GitHub Actions
secrets=(
    "SMTP_SERVER"
    "SMTP_PORT"
    "SMTP_USER"
    "SMTP_PASSWORD"
    "FROM_EMAIL"
)

# Loop through each secret and remove it using the GitHub CLI
for secret in "${secrets[@]}"; do
    if gh secret delete "$secret"; then
        echo "✅ Successfully deleted secret '$secret'."
    else
        echo "⚠️ Secret '$secret' might not exist or failed to delete."
    fi
done
