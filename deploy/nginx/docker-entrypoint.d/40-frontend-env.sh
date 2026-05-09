#!/bin/sh
set -eu

cat > /usr/share/nginx/html/env.js <<EOF
window.__APP_CONFIG__ = {
  VITE_REACT_APP_SERVER_URL: "${VITE_REACT_APP_SERVER_URL:-}"
};
EOF
