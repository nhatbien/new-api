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

Replace `https://app.example.com` with the frontend domain.

Notes:

- `Dockerfile.backend` intentionally skips `web/default` and `web/classic` builds.
- The Go binary still requires embedded frontend paths at compile time, so the
  Dockerfile creates small placeholder `dist/index.html` files.
- If the backend is configured as a master node, `FRONTEND_BASE_URL` is ignored by
  the current router logic and the backend will serve the embedded placeholder
  page for frontend routes. For split deployment, do not rely on the backend root
  route; route users to the frontend domain instead.

## Frontend app

Create a second Coolify application from the same repository.

### Option A: Dockerfile frontend app

- Build pack: Dockerfile
- Dockerfile: `Dockerfile.frontend`
- Port: `80`

Environment variables:

```env
BACKEND_URL=https://api.example.com
```

`Dockerfile.frontend` builds `web/default` with Bun, serves the generated `dist`
with Nginx, and proxies API paths to `BACKEND_URL`:

```text
/api
/v1
/mj
/pg
```

Use this option when you want the frontend app itself to handle SPA routing and
API proxying.

### Option B: Coolify static site

- Build pack: Static / Nixpacks / Node-based static site
- Base directory: `web/default`
- Build command: `bun install && bun run build`
- Publish directory: `dist`

Optional environment variable:

```env
VITE_REACT_APP_SERVER_URL=https://api.example.com
```

The production frontend commonly calls API routes by relative paths such as
`/api`, `/v1`, `/mj`, and `/pg`. If the frontend and backend use different
domains and you do not use `Dockerfile.frontend`, configure Coolify/Traefik/Nginx
routing for the frontend domain:

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
