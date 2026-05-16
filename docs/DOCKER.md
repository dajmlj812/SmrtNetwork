# Docker

SmrtNetwork ships as a Docker image alongside the desktop binaries. The image is the recommended option for **server / NAS / homelab** deployment (Synology, Unraid, Proxmox LXC, a plain Linux box). For single-user desktop use, the native binaries (`build:exe`, `build:mac`, `build:linux`) are still simpler.

---

## Quick start (Docker Compose)

```bash
# 1. Copy the example env file and fill in your API keys
cp .env.example .env
$EDITOR .env

# 2. Bring it up
docker compose up -d

# 3. Browse to http://localhost:3000
```

The compose file pulls `dajmlj812/smrtnetwork:latest` from Docker Hub by default. To build from source instead, uncomment the `build: .` line and comment out the `image:` line.

---

## Required environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `MERAKI_API_KEY` | yes | — | Meraki Dashboard API key |
| `ANTHROPIC_API_KEY` | yes | — | Anthropic API key for the AI features |
| `MERAKI_BASE_URL` | no | `https://api.meraki.com/api/v1` | Override only if you're on a Meraki regional endpoint |
| `TZ` | no | `UTC` | Container timezone — affects scheduled-report timing and log timestamps |
| `PORT` | no | `3000` | HTTP listen port inside the container |

API keys can also be configured later through the Settings UI; the env vars seed initial values.

---

## Persistent data

Everything that needs to survive container restarts lives in **`/data`** inside the container:

- `smrt-config.json` — settings (SMTP, alerting, LDAP, integrations, etc.)
- `data/snapshots.json` — historical health/client/bandwidth snapshots
- `data/alert-log.json` — alert history
- `data/audit-log.json` — login + settings audit trail
- `data/client-tags.json` — client tagging metadata
- `data/report-history.json` — generated report metadata

The compose file uses a named Docker volume (`smrt-data`). To use a bind mount instead, replace `smrt-data:/data` with `./data:/data` and create a local `data` directory owned by UID 1001 (matching the in-container `smrt` user).

---

## Plain `docker run` (no compose)

```bash
docker run -d \
  --name smrtnetwork \
  --restart unless-stopped \
  -p 3000:3000 \
  -e MERAKI_API_KEY=... \
  -e ANTHROPIC_API_KEY=... \
  -v smrt-data:/data \
  dajmlj812/smrtnetwork:latest
```

---

## Building locally

```bash
# Build only (tags: <namespace>/smrtnetwork:<version> and :latest)
npm run docker:build

# Build + push both tags to Docker Hub (requires `docker login` first)
npm run docker:push
```

The script reads the version from `package.json`. To publish under a different Docker Hub namespace, override via env var:

```bash
DOCKER_NAMESPACE=mycompany npm run docker:push
```

---

## Health check

The container has a built-in healthcheck that hits `/api/poller/status` every 30 s. View it with:

```bash
docker inspect --format='{{.State.Health.Status}}' smrtnetwork
```

`/api/poller/status` is cheap (no Meraki call, no auth) and is safe to hit from external monitors too.

---

## Updating

```bash
docker compose pull
docker compose up -d
```

The named `smrt-data` volume is preserved across updates; nothing is reset.

---

## Image details

- Base: `node:24-alpine`
- Multi-stage build using Next.js `output: "standalone"` — runtime image is ~150 MB
- Runs as non-root user (`smrt`, UID/GID 1001)
- Exposes port 3000
- No build-time secrets baked in — all credentials come from env vars or `/data/smrt-config.json` at runtime
