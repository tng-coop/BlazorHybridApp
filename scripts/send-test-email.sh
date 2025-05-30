#!/bin/bash

curl --url 'smtp://localhost:1025' \
  --mail-from 'no-reply@localtest.com' \
  --mail-rcpt 'test@example.com' \
  --upload-file <(echo -e "Subject: Local SMTP Test\n\nThis is a test email.")
