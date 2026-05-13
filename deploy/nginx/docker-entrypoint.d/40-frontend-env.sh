#!/bin/sh
set -eu

# Inject runtime environment into /app/public/env.js so the browser can read
# VITE_REACT_APP_SERVER_URL / NEXT_PUBLIC_REACT_APP_SERVER_URL at request time
# without rebuilding the image.
TARGET="${ENV_JS_PATH:-/app/public/env.js}"
mkdir -p "$(dirname "$TARGET")"

cat > "$TARGET" <<EOF
window.__APP_CONFIG__ = {
  VITE_REACT_APP_SERVER_URL: "${VITE_REACT_APP_SERVER_URL:-}",
  NEXT_PUBLIC_REACT_APP_SERVER_URL: "${VITE_REACT_APP_SERVER_URL:-}"
};
EOF

exec "$@"
