#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <send|edit> <message-file-or-plain-text> [message_id_file_or_value]" >&2
  exit 1
fi

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
  echo "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set" >&2
  exit 1
fi

MODE="$1"
INPUT="$2"

if [ -f "$INPUT" ]; then
  MESSAGE="$(cat "$INPUT")"
else
  MESSAGE="$INPUT"
fi

escape_html() {
  local value="${1:-}"
  value="${value//&/&amp;}"
  value="${value//</&lt;}"
  value="${value//>/&gt;}"
  printf '%s' "$value"
}

# Telegram sendMessage limit is 4096 chars. Keep some room for safety.
MAX_LEN=3900
if [ "${#MESSAGE}" -gt "$MAX_LEN" ]; then
  MESSAGE="${MESSAGE:0:$MAX_LEN}

[message truncated]"
fi

if [ "$MODE" = "send" ]; then
  MESSAGE="$(escape_html "$MESSAGE")"
  RESPONSE="$(curl -fsS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${MESSAGE}" \
    --data-urlencode "parse_mode=HTML" \
    --data-urlencode "disable_web_page_preview=true")"

  printf '%s' "$RESPONSE" | sed -n 's/.*"message_id":\([0-9][0-9]*\).*/\1/p'
  exit 0
fi

if [ "$MODE" = "edit" ]; then
  if [ "$#" -lt 3 ]; then
    echo "edit mode requires message id or file" >&2
    exit 1
  fi

  MESSAGE_ID_INPUT="$3"
  if [ -f "$MESSAGE_ID_INPUT" ]; then
    MESSAGE_ID="$(tr -d '\n' < "$MESSAGE_ID_INPUT")"
  else
    MESSAGE_ID="$MESSAGE_ID_INPUT"
  fi

  if [ -z "$MESSAGE_ID" ]; then
    echo "message id is empty" >&2
    exit 1
  fi

  MESSAGE="$(escape_html "$MESSAGE")"
  curl -fsS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "message_id=${MESSAGE_ID}" \
    --data-urlencode "text=${MESSAGE}" \
    --data-urlencode "parse_mode=HTML" \
    --data-urlencode "disable_web_page_preview=true" \
    > /dev/null
  exit 0
fi

echo "Unknown mode: $MODE" >&2
exit 1
