#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <message-file-or-plain-text>" >&2
  exit 1
fi

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
  echo "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set" >&2
  exit 1
fi

INPUT="$1"

if [ -f "$INPUT" ]; then
  MESSAGE="$(cat "$INPUT")"
else
  MESSAGE="$INPUT"
fi

# Telegram sendMessage limit is 4096 chars. Keep some room for safety.
MAX_LEN=3900
if [ "${#MESSAGE}" -gt "$MAX_LEN" ]; then
  MESSAGE="${MESSAGE:0:$MAX_LEN}

[message truncated]"
fi

curl -fsS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
  --data-urlencode "text=${MESSAGE}" \
  --data-urlencode "parse_mode=HTML" \
  --data-urlencode "disable_web_page_preview=true" \
  > /dev/null
