# Features

## Organization Overview

- Grid view of all Meraki networks in the organization, color-coded by health score
- Device counts per site: online, offline, alerting
- Click any network card to select it and drill in
- Auto-refreshes every 60 seconds
- Supports multiple organizations — switch via Settings

## Dashboard

Restructured for NOC priority — the AI verdict is on top, counts below, trends in a single tabbed panel.

- **AI Network Health card** (full row, accent-tinted) — Claude scores the network and lists prioritised issues + remediation steps. Auto-runs whenever the selected network changes; refresh button re-runs on demand
- **Alerts Summary** — enabled alert profiles for the selected network, side-by-side with the AI card
- **Stat cards** — total devices, online (with up/down trend vs. last snapshot), offline/alerting (tinted red when non-zero), connected clients; refreshes every 60 seconds
- **Trends panel** — single tabbed widget collapsing three previous charts:
  - **Health** — 30 most recent snapshots
  - **Clients** — 24-hour connected-client trend
  - **Bandwidth** — sent/received bytes over the last 48 snapshots
- **Live event feed** — recent Meraki events for the selected network (association, VPN changes, reboots) with a pulsing live dot; network name in header links to the Traffic page
- **Poller status indicator** — small status line under the page title; shows whether the background health poller is running and the active threshold
- **Network Report** — generates a per-network device + client HTML report; saved to report history automatically
- **Report history** — last 15 generated reports accessible from a dropdown on the Report button
- **Download HTML / PDF** — org-wide health report; optionally emailed if SMTP is configured
- **Update banner** — notifies when a newer version of SmrtNetwork is available on GitHub

## Network Topology

- SVG device map for the selected network, grouped by layer: Firewall/Router → Switch → Access Point → other categories
- Nodes color-coded by live status: green (online), yellow (alerting), red (offline), gray (unknown/dormant)
- Dashed connection lines drawn from each device to its nearest parent layer
- Hover any node to see: device name, model, serial, LAN IP, WAN IP, status
- **Uplink history sparkline** — hovering an MX/Z-series appliance shows a 1-hour WAN1 loss/latency sparkline with avg latency and avg packet loss (loads async, does not block the map)
- Summary chip bar: per-status counts and total device count
- Available at `/topology` — accessible from the sidebar

## Devices

- Full device table for the selected network, sorted by health (alerting → offline → online)
- Columns: name, model, status, firmware, IP, MAC, network
- Search by MAC address or IP
- **Device detail panel** — click any device to see: model, serial, firmware, IPs, connected clients
- **AI diagnosis** — Claude analyzes loss/latency history and client data and returns a diagnosis with remediation steps
- **Create Jira Issue** — after AI diagnosis, one click creates a Jira issue pre-filled with device details and the diagnosis (requires Jira configured in Settings)

## Clients

- All clients seen on the selected network in the past 24 hours
- Columns: description, MAC, IP, SSID/AP, manufacturer, OS, usage (sent/recv), first/last seen
- Full list (up to 1000 clients) — no artificial row caps
- **Client detail panel** — click any client to see: Active/Inactive badge, quick-stats bar (Total Usage · Days Seen · Access Point), full session details
- **Client tagging** — label any client with a name and optional group (stored locally); edit inline in the detail panel
- Tag badge shown in the table; group filter dropdown filters the list by group; label/group included in search and CSV export
- Tag context is included in Claude's AI client analysis for better device identification
- **CSV export** — download the full client list as a UTF-8 CSV (Excel-compatible), including Label and Group columns

## Traffic

- **Top talkers chart** — horizontal bar chart of top 25 clients by bandwidth; updates every 30 seconds
- **Bandwidth summary** — sent/received/total and client count across four periods: 1 hour, 6 hours, 24 hours, 7 days
- **AI traffic analysis** — identifies unusual patterns, top applications, and QoS recommendations
- **WAN uplink health** — loss % and latency for MX/Z appliances with a selectable timespan: `1h / 6h / 24h / 7d / 30d`; chart resolution auto-scales with the selected window

## Wireless

- Enabled SSID list with auth mode and encryption details
- **Connection pipeline** — funnel chart showing association → auth → DHCP → DNS → success rates with color-coded drop indicators
- **Channel utilization** — per-AP utilization bars for 2.4 GHz and 5 GHz

## Switches

- Collapsible per-switch port tables for all MS switches in the network
- Columns: port ID, name, status, speed, VLAN, PoE draw (W), client count, uplink flag
- Disconnected non-uplink ports highlighted
- All switches and all ports shown (no row limit)
- **Streamed progressive loading** — large networks load switch-by-switch instead of one blocking spinner. NDJSON stream from `/api/meraki/switches` emits each switch as soon as Meraki returns its data; a live progress bar ticks up as rows appear. Concurrency is capped server-side at 4 to stay under Meraki's 10 req/s rate limit
- **CSV export** — download port data per switch

## VPN

- Org-wide AutoVPN table showing all MX appliances, their hub/spoke role, and tunnel peer counts
- Expandable peer list with reachability status (reachable / unreachable) per tunnel
- Third-party VPN peer status where configured

## Cellular Gateways (`/cellular`)

- Org-wide list of all MG cellular gateway uplink statuses (filtered to selected network if one is chosen)
- Per-gateway cards showing: model, serial, last reported time
- Per-uplink details: interface, status (active/ready/not connected), provider, IP, connection type, signal type
- **RSRP/RSRQ signal bars** — visual 4-bar signal strength indicator derived from RSRP (−140 to −44 dBm → 0–100%)
- Refreshes every 60 seconds

## Sensors (`/sensors`)

- Org-wide list of all MT sensor latest readings (filtered to selected network if one is chosen)
- Per-sensor cards with network name and last reading timestamp
- **Metric badges** with icons and color thresholds:
  - Temperature: green ≤28°C / yellow ≤35°C / red >35°C; shows °C and °F
  - Humidity: blue >70% RH / yellow <30% / green otherwise
  - Door: green (closed) / yellow (open) with icon
  - CO₂: green ≤800 ppm / yellow ≤1000 / red >1000
- Refreshes every 30 seconds

## Cameras (`/cameras`)

- All MV cameras in the selected network shown as thumbnail cards in a responsive grid
- **Auto-refreshing live snapshots** — each card regenerates its snapshot every 20 seconds, staggered 1.5 s per card so all cameras don't hit Meraki simultaneously. Polling pauses when the browser tab is hidden and resumes on focus
- **Live indicator** — a pulsing "● Live" pill flashes in the corner of each card during refresh
- **Preload-before-swap** — Meraki returns a snapshot URL immediately but the JPEG takes a few seconds to become available; the new image preloads off-screen (up to 4 retries × 1.5 s) and only swaps into the visible `<img>` once it actually loads. Previous snapshot stays on screen throughout — no flicker, no "No preview" flash between refreshes
- Status badge overlay (online/alerting/offline/dormant) on each thumbnail
- LAN IP, model, and serial shown per camera
- **Direct video link** (external icon) opens the camera's live video URL in a new tab
- Manual per-card refresh button + page-level "Reload list" button
- Offline cameras don't poll (no rate-limit waste); shows "Camera offline" instead

## Alerts

- **Natural language alert creation** — describe an alert in plain English (e.g. "Alert me on Slack when RJW HQ drops below 75%"); Claude parses network, threshold, and channel with a confidence rating; one-click apply saves the config
- **Active alerts** — enabled alert profiles for the selected network with notification destinations
- **Alert log** — history of all triggered health alerts with timestamp, network, score, channel, and status; network name is clickable and navigates to the Dashboard with that network selected
- **AI recommendations** — Claude reviews current alert coverage and suggests gaps or tuning
- **CSV export** — download the full alert log
- **Slack webhook** — sends alert notifications to one or more Slack channels (comma-separated URLs)
- **Teams webhook** — sends alert notifications to one or more Microsoft Teams channels (comma-separated URLs)
- **ServiceNow** — auto-creates an incident when a health alert fires (configurable assignment group, category, CMDB CI)
- **Generic health webhook** — POSTs a JSON payload to any URL(s) on health alert (comma-separated list)
- **Alert muting** — set a date/time in Settings to suppress all notifications until that time (maintenance window)

## Firmware Audit

- Org-wide view of firmware versions grouped by product type (wireless, switch, appliance, etc.)
- Collapsible section per product type showing all versions, device counts, and network counts
- **Status badges**: "Uniform" (all same version), "Baseline" (most common when mixed), "Potentially outdated" (minority versions)
- Mixed-version product types flagged with a yellow "N versions" badge
- Firmware version cells link to Meraki release notes for the device's product category

## Chat

- Multi-turn natural language chat powered by `claude-sonnet-4-6`
- Network context (devices, clients, alerts) automatically injected into every conversation
- Streaming responses rendered as formatted markdown
- Starter prompts: "What devices are offline?", "Who is using the most bandwidth?", "Are there any security concerns?" etc.

## Compare

- Side-by-side health comparison of any two networks in the organization
- AI-generated comparison narrative highlighting differences
- Snapshot trend charts for both networks on one screen

## Snapshots

- Background poller saves a health snapshot every 5 minutes
- Snapshots used for the dashboard trend chart and the compare view
- Automatically pruned: snapshots older than 30 days are removed; hard cap of 2,000 entries
- Stored alongside `smrt-config.json` under `$SMRT_DATA_DIR/data/` (defaults: `%APPDATA%\SmrtNetwork\` on Windows exe, `~/Library/Application Support/SmrtNetwork/` on macOS, `~/.config/SmrtNetwork/` on Linux, `/data/` in the Docker container)

## Meraki API caching

In-memory cache layer (`src/lib/meraki/cache.ts`) with inflight-request coalescing sits in front of every read-heavy Meraki proxy route. Eliminates the 429 storms that come from multiple browser tabs / page reloads refetching the same data.

| Endpoint | TTL |
|---|---|
| `/api/meraki/organizations` | 10 min |
| `/api/meraki/networks` | 5 min |
| `/api/meraki/alerts`, `/api/meraki/firmware` | 2 min |
| `/api/meraki/devices` (network), `/api/meraki/cameras` | 60 s |
| `/api/meraki/devices` (org statuses), `/api/meraki/clients`, `/api/meraki/overview` | 30 s |
| `/api/meraki/events` | 15 s |
| `/api/meraki/cameras/[serial]/snapshot` | 5 s (coalesce-only) |

429 retries against Meraki are bounded to 4 attempts with exponential backoff — requests fail loudly within ~20 s instead of hanging forever.

## Global Search (Cmd+K / Ctrl+K)

- Searches networks, devices, and clients by name, IP, or MAC in real time
- Keyboard-navigable results list
- Selecting a result navigates to the relevant page and selects the network

## Settings

| Section | Fields |
|---|---|
| API Keys | Meraki API Key, Anthropic API Key, Meraki Base URL |
| Active Organization | Dropdown of all orgs visible to the API key |
| Email Reports | SMTP host, port, credentials, from/to, schedule (none/daily/weekly at 7am), test button |
| Org Health Summary Email | Schedule (none/daily/weekly at 8am), optional override recipient |
| Notifications | Slack webhook URL(s), Teams webhook URL(s), test buttons |
| Alerting | Enable toggle, health threshold, cooldown minutes, alert muting |
| Per-Network Thresholds | Override the global threshold per network |
| Per-Network Report Recipients | Override SMTP "To" address per network for scheduled reports |
| Security | Admin password, read-only password, session timeout (days), LDAP / Active Directory |
| ServiceNow | Enable, instance URL, username/password, assignment group, category, CMDB CI, test button |
| Jira | Enable, Jira URL, email, API token, project key, issue type, test button |
| InfluxDB | Enable, URL, v1/v2 mode, org/bucket/token (v2) or database/user/pass (v1), test button |
| Health Webhook | Generic JSON webhook URL(s) for health alert events |
| Audit Log | View recent events, export CSV, clear (admin only) |

## Security & Access Control

- **Admin password** — optional app-level password; without one the app is open to anyone on the network
- **Read-only password** — separate PIN granting view-only access; all settings changes are disabled for read-only users
- **Session timeout** — configurable 1–365 days (default 7); applies to both admin and read-only sessions
- **LDAP / Active Directory** — authenticate with a directory account; group membership maps to admin or read-only role; PIN auth still available as fallback
- **Audit log** — all logins, settings saves, and password changes recorded with timestamp (last 1,000 entries; CSV export)
- **API auth gate** — every `/api/*` request is verified against the session cookie in middleware (`src/proxy.ts`). A narrow public allowlist remains: `/api/auth/{login,logout,config}` and `/api/poller/status` (container HEALTHCHECK)
- **Hardened session cookie** — `HttpOnly` + `SameSite=Lax`; `Secure` flag automatically set when the request arrived over HTTPS (directly or via an upstream proxy's `x-forwarded-proto: https` header)
- **Hardened response headers** on every response: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`, `Strict-Transport-Security: max-age=63072000; includeSubDomains`. `X-Powered-By` removed

## Integrations

| Integration | Trigger | What it does |
|---|---|---|
| ServiceNow | Health alert fires | Creates an incident with network details, score, and device counts |
| Jira | AI Diagnose → Create Jira Issue | Creates an issue with device info and Claude's diagnosis |
| InfluxDB | Every 5-minute poll | Writes `network_health` time-series metrics for Grafana |
| Health webhook | Health alert fires | POSTs JSON payload to any configured URL(s) |

## Dark / Light Mode

- Toggle between dark and light theme from the sidebar footer
- Both themes fully supported — UI is built on semantic Tailwind v4 tokens (`foreground-strong`, `card`, `accent`, etc.) defined in `src/app/globals.css`; no hardcoded white-opacity utilities remain in the codebase
- Persisted in a `smrt-theme` cookie — survives browser restarts and is read server-side to avoid flash-of-unstyled-content
- Defaults to dark mode

## Navigation

Sidebar grouped into four sections for fast scanning:

| Section | Items |
|---|---|
| Monitor | Overview, Dashboard, Topology, Alerts |
| Inventory | Devices, Clients, Firmware, Traffic |
| By product | Switches, Wireless, VPN, Cellular, Sensors, Cameras |
| Tools | Ask AI, Compare, Settings |

Section labels rendered as small uppercase-tracked headers; the active nav item is tinted with the brand accent green.

## Typography

- **Inter** (sans) and **JetBrains Mono** (mono) loaded via `next/font/google` — no external requests, no FOUT
- Page headings: `text-2xl font-bold tracking-tight text-foreground-strong`
- Tabular numerics on stat cards (`tabular-nums`) so digits align column-wise

## PWA (Progressive Web App)

- `manifest.json` enables "Install App" prompt in supported browsers (Chrome, Edge, Safari)
- Standalone display mode — runs without browser chrome when installed
- Theme color: SmrtNetwork green (`#1e9c4a`)

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Ctrl+K` | Open global search |
| `?` | Toggle keyboard shortcuts overlay |
| `Esc` | Close modals / search |
| `↑ / ↓` | Navigate search results |
| `Enter` | Select search result |

## CSV Export

Available on: Clients table, Devices table, Alert Log table. Files use UTF-8 BOM for correct Excel rendering.

## Container Deployment (Docker)

Recommended for server / NAS / homelab deployment (Synology, Unraid, Proxmox LXC, plain Linux). For single-user desktop use, the native binaries (below) remain simpler.

- **Public image:** `dajmlj812/smrtnetwork` on Docker Hub (`:latest` and version-pinned tags `:0.7.x`)
- **Multi-stage build** based on `node:24-alpine` using Next.js `output: "standalone"` — runtime image is ~150 MB
- **Non-root container user** (`smrt`, UID/GID 1001)
- **Single persistent volume** at `/data` for `smrt-config.json`, snapshots, alert log, audit log, report history, client tags
- **Built-in HEALTHCHECK** hits the cheap `/api/poller/status` endpoint every 30 s
- **One-command deploy** via the included `docker-compose.yml` (`docker compose up -d` after filling in `.env`)
- **`npm run docker:build` / `npm run docker:push`** scripts auto-tag the image with the version from `package.json`; override the namespace via `DOCKER_NAMESPACE` env var
- Full operator docs in [`docs/DOCKER.md`](DOCKER.md)

## Portable Executables

### Windows
- Single `.exe` file — no Node.js, no installer (`npm run build:exe`)
- Embeds the Node.js runtime (same version used during build)
- Finds a free port in 3000–3099 automatically
- Opens the browser automatically after 3 seconds
- Config persists in `%APPDATA%\SmrtNetwork\` across runs
- `SmrtNetwork-Silent.vbs` launcher available for no-console-window operation

### macOS
- Single binary (`npm run build:mac` → `dist/SmrtNetwork-mac`)
- Config stored in `~/Library/Application Support/SmrtNetwork/`
- Opens browser automatically with `open`

### Linux
- Single binary (`npm run build:linux` → `dist/SmrtNetwork-linux`)
- Config stored in `~/.config/SmrtNetwork/` (respects `XDG_CONFIG_HOME`)
- Opens browser with `xdg-open` / `sensible-browser` fallback
