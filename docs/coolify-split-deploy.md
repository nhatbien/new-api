# Coolify split deployment

This deployment mode builds the backend and frontend as separate Coolify apps so
frontend build failures do not block backend deployments.

## Backend app

Create a Coolify application from this repository.

- Build pack: Dockerfile
- Dockerfile: `Dockerfile.backend`
- Port: `3000`

Environment variables:

```env
FRONTEND_BASE_URL=https://app.example.com
SQL_DSN=postgresql://USER:PASSWORD@HOST:5432/new-api
REDIS_CONN_STRING=redis://:PASSWORD@HOST:6379
TZ=Asia/Shanghai
ERROR_LOG_ENABLED=true
BATCH_UPDATE_ENABLED=true
NODE_NAME=new-api-backend-1
```

Replace `https://app.example.com` with the frontend domain. For multiple
frontend domains, use a comma-separated list, for example
`FRONTEND_BASE_URL=https://app.example.com,https://www.example.com`.

`FRONTEND_BASE_URL` is also used as the allowed CORS origin for direct
cross-domain browser requests from the frontend to the backend.

Notes:

- `Dockerfile.backend` intentionally skips `web/default` and `web/classic` builds.
- The Go binary still requires embedded frontend paths at compile time, so the
  Dockerfile creates small placeholder `dist/index.html` files.
- When multiple frontend domains are configured, backend fallback redirects use
  the first `FRONTEND_BASE_URL` value. CORS allows all configured values.

## Frontend app

Create a second Coolify application from the same repository.

### Option A: Dockerfile frontend app

- Build pack: Dockerfile
- Dockerfile: `Dockerfile.frontend`
- Port: `80`

Environment variables:

```env
BACKEND_URL=http://backend-internal-host:3000
VITE_REACT_APP_SERVER_URL=
```

`Dockerfile.frontend` builds `web/default` with Bun and serves the generated
`dist` with Nginx. Keep `VITE_REACT_APP_SERVER_URL` empty so the browser calls
same-origin paths such as `/api/status`. Nginx proxies `/api`, `/v1`, `/mj`, and
`/pg` to `BACKEND_URL`, which avoids cross-origin session cookie issues.
Use an internal Docker/Coolify service URL for `BACKEND_URL` when possible, for
example `http://new-api:3000` in Docker Compose. Avoid pointing it at the public
API domain from inside the frontend container if the host does not support
hairpin NAT or blocks container-to-public-IP traffic.

The Docker image also writes `/env.js` at container startup, so
`VITE_REACT_APP_SERVER_URL` can be changed in Coolify environment variables
without rebuilding the frontend image. If it is set to `https://api.example.com`,
the browser will call the backend directly and CORS/session cookie handling is
required again.

### Option B: Coolify static site

- Build pack: Static / Nixpacks / Node-based static site
- Base directory: `web/default`
- Build command: `bun install && bun run build`
- Publish directory: `dist`

Optional environment variable:

```env
VITE_REACT_APP_SERVER_URL=
```

The production frontend commonly calls API routes by relative paths such as
`/api`, `/v1`, `/mj`, and `/pg`. If the frontend and backend use different
domains and `VITE_REACT_APP_SERVER_URL` is not set, configure
Coolify/Traefik/Nginx routing for the frontend domain:

```text
/api  -> backend app port 3000
/v1   -> backend app port 3000
/mj   -> backend app port 3000
/pg   -> backend app port 3000
```

Example domains:

```text
Frontend: https://app.example.com
Backend:  https://api.example.com
```

With the proxy rules above, browser requests to
`https://app.example.com/api/status` are forwarded to the backend service.

For direct backend calls, browser requests go to
`https://api.example.com/api/status` instead.
