#!/bin/sh
set -eu

# Inject runtime environment into /app/public/env.js so the browser can read
# VITE_REACT_APP_SERVER_URL / NEXT_PUBLIC_REACT_APP_SERVER_URL at request time
# without rebuilding the image.
#
# Resolution order:
#   1. VITE_REACT_APP_SERVER_URL (preferred)
#   2. NEXT_PUBLIC_REACT_APP_SERVER_URL
# If neither is set (both empty), keep the existing env.js that was baked
# into the image instead of wiping it with empty strings.
TARGET="${ENV_JS_PATH:-/app/public/env.js}"
mkdir -p "$(dirname "$TARGET")"

SERVER_URL="${VITE_REACT_APP_SERVER_URL:-${NEXT_PUBLIC_REACT_APP_SERVER_URL:-}}"

if [ -n "$SERVER_URL" ]; then
  cat > "$TARGET" <<EOF
window.__APP_CONFIG__ = {
  VITE_REACT_APP_SERVER_URL: "${SERVER_URL}",
  NEXT_PUBLIC_REACT_APP_SERVER_URL: "${SERVER_URL}"
};
EOF
  echo "[frontend-env] wrote $TARGET with SERVER_URL=${SERVER_URL}"
else
  echo "[frontend-env] no VITE_REACT_APP_SERVER_URL/NEXT_PUBLIC_REACT_APP_SERVER_URL set; keeping existing $TARGET"
fi

exec "$@"
