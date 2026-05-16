# Docker

SmrtNetwork ships as a Docker image alongside the desktop binaries. The image is the recommended option for **server / NAS / homelab** deployment (Synology, Unraid, Proxmox LXC, a plain Linux box). For single-user desktop use, the native binaries (`build:exe`, `build:mac`, `build:linux`) are still simpler.

---

## Two deployment patterns

The repo ships two compose files. Pick one based on what you're doing:

| File | When to use | Public exposure |
|---|---|---|
| **`docker-compose.yml`** | Local / NAS / homelab where you reach SmrtNetwork on the host's IP (or behind your own reverse proxy) | Container exposes port 3000 on the host |
| **`docker-compose.tunnel.yml`** | Reachable on the public internet via Cloudflare Tunnel — no inbound ports, origin IP hidden | None — cloudflared makes outbound QUIC connections |

---

## Quick start — local / behind your own proxy

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

## Quick start — Cloudflare Tunnel (public internet, zero inbound ports)

Use this if SmrtNetwork needs to be reachable on the public internet. Cloudflare handles TLS termination, WAF, DDoS protection, and edge routing. Your server makes only outbound connections to Cloudflare — **no inbound port 80/443 firewall rules required**, and your origin IP is never exposed to attackers.

**Prerequisites:** a domain on Cloudflare (free tier is fine).

```bash
# 1. Create the tunnel in Cloudflare Zero Trust
#    https://one.dash.cloudflare.com/ → Networks → Tunnels
#    → Create a tunnel → Cloudflared → name it 'smrtnetwork'
#    → COPY THE LONG --token VALUE (starts with eyJ...)

# 2. Put the token in .env alongside your Meraki + Anthropic keys
cp .env.example .env
$EDITOR .env   # set CLOUDFLARE_TUNNEL_TOKEN, MERAKI_API_KEY, ANTHROPIC_API_KEY

# 3. Create the shared Docker network (one time)
docker network create proxy

# 4. Create the bind-mount data directory with the right owner
mkdir -p ./data && sudo chown -R 1001:1001 ./data

# 5. Bring it up
docker compose -f docker-compose.tunnel.yml up -d

# 6. Back in Zero Trust dashboard → your tunnel → Public Hostname
#    → Add a public hostname:
#      Subdomain: smrtntwrk  (or whatever you want)
#      Domain:    yourdomain.com
#      Type:      HTTP
#      URL:       smrtnetwork:3000      ← no trailing space!
#    Cloudflare auto-creates the DNS CNAME pointing at the tunnel.

# 7. Browse to https://smrtntwrk.yourdomain.com
```

**Security posture this gives you:**
- TLS terminated at the Cloudflare edge with their managed cert
- WAF and DDoS protection in front of every request
- Origin IP never exposed — `nmap` against your server reveals nothing useful
- Four redundant tunnel connections to different Cloudflare PoPs for HA
- Server firewall can deny all inbound except SSH

**Verifying the tunnel is the active path:**

```bash
# Tunnel request counter should increment when you hit the public URL
curl -s http://<tunnel-container-ip>:20241/metrics | grep cloudflared_tunnel_total_requests

# This should NOT return the app (origin bypass closed):
curl -k --resolve yourdomain.com:443:<origin-ip> https://yourdomain.com/api/poller/status
```

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
