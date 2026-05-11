#!/bin/sh
set -eu

browser_api_base_url="${VITE_REACT_APP_BROWSER_SERVER_URL:-}"

cat > /usr/share/nginx/html/env.js <<EOF
window.__APP_CONFIG__ = {
  VITE_REACT_APP_SERVER_URL: "${browser_api_base_url}"
};
EOF
