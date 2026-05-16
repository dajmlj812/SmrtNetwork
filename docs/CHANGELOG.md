# Changelog

All notable changes to SmrtNetwork are documented here.

---

## Deployment hardening — 2026-05-16

*(No app code change — deployment recipe + docs only. Test deployment cut over to this pattern on 2026-05-16.)*

**Cloudflare Tunnel deployment pattern.** Adds `docker-compose.tunnel.yml` as a sibling to the default compose file. Runs a `cloudflare/cloudflared:latest` container alongside SmrtNetwork on a shared `proxy` Docker network. All public traffic arrives via outbound QUIC connections from cloudflared to Cloudflare's edge — **no inbound ports needed on the server's firewall**, and the origin IP is never exposed.

Eliminates the "Cloudflare bypass via direct origin IP" finding from the external pen-test: even if an attacker discovers the server's IP, there's no path to the app — the host firewall can deny all inbound except SSH.

**Files:**
- `docker-compose.tunnel.yml` — Cloudflare Tunnel compose recipe with a `smrtnetwork` + `cloudflared` pair, bind-mounted `./data`, shared `proxy` external network, no published ports
- `.env.example` — documents the new `CLOUDFLARE_TUNNEL_TOKEN` variable
- `docs/DOCKER.md` — new "Two deployment patterns" comparison + full Cloudflare Tunnel quick-start (token generation, hostname mapping, verification commands, security posture)

The default `docker-compose.yml` (localhost / behind-your-own-proxy use case) is unchanged.

---

## v0.7.3 — 2026-05-16

### Security hardening

**Session cookie now flagged Secure + SameSite=Lax.** All `smrt-session` cookie writes (login open-mode, LDAP, admin PIN, read-only PIN, logout) go through a shared `setSessionCookie()` helper in `src/lib/auth/session.ts`. The `Secure` flag is set only when the request actually arrived over HTTPS (detected via `request.nextUrl.protocol` or an `x-forwarded-proto: https` header from upstream proxies like NPM). This keeps the desktop exe / dev server working on HTTP localhost while locking the cookie down in production deployments terminating TLS upstream. `HttpOnly` was already set; `SameSite=Lax` is new and mitigates CSRF on cross-site POSTs.

**Hardened HTTP response headers** added to every response via `next.config.ts`:
- `X-Frame-Options: DENY` — prevents clickjacking via iframe embedding
- `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing attacks
- `Referrer-Policy: strict-origin-when-cross-origin` — limits Referer leakage
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()` — disables features the app doesn't use
- `Strict-Transport-Security: max-age=63072000; includeSubDomains` — enforces HTTPS for 2 years (browsers ignore this header when received over HTTP, so it's safe on the desktop exe)
- Removed `X-Powered-By: Next.js` (set `poweredByHeader: false`) — no need to advertise framework

CSP intentionally not added in this release — Next.js inline scripts need nonce wiring that's a larger refactor; it will land in report-only mode in a future patch.

---

## v0.7.2 — 2026-05-16

### Security fix (CRITICAL)

**Authentication bypass on all `/api/*` routes.** Prior to v0.7.2, the session cookie was only verified inside the root `layout.tsx` server component, which gates page renders but has zero effect on direct HTTP calls to `/api/*`. Any caller with network reachability to the app could read full configuration (masked API keys, SMTP credentials, integration settings, audit log) and enumerate the entire Meraki org (organizations, networks, devices) without any authentication. POST endpoints that mutate config and trigger AI analyses were similarly exposed.

Discovered during external pen-testing of the test deployment.

**Fix:**
- New shared session helper `src/lib/auth/session.ts` is the single source of truth for verifying the `smrt-session` cookie.
- `src/proxy.ts` (Next.js middleware) now enforces session verification on every `/api/*` request and returns `401 Unauthorized` for unsigned-in callers.
- A small allowlist of public endpoints remains accessible without auth — `/api/auth/login`, `/api/auth/logout`, `/api/auth/config` (login page reads it pre-auth), and `/api/poller/status` (container HEALTHCHECK).
- Middleware runs on the Node.js runtime so it can use Node's `crypto` for hash verification, matching the layout's logic exactly.
- `layout.tsx` refactored to call the same `verifySession()` helper — page-render and API-gate logic can no longer drift.

**Action required after upgrade:** None — existing session cookies remain valid (the new helper accepts all three formats the login route ever produced, including the legacy pre-role-prefix format).

---

## v0.7.1 — 2026-05-16

### Bug fixes

- **Login page now renders without the app shell.** The sidebar, global search, keyboard shortcuts modal, update banner, and network/role/query providers are no longer mounted on `/login` or `/api/auth/*`. Previously the sidebar was always rendered, leaking navigation chrome onto the unauthenticated login screen. Public routes now render full-bleed inside the theme provider only.

---

## v0.7.0 — 2026-05-15

### UI redesign

**Semantic token-based theming**
- Light mode is now correct — replaced ~660 hardcoded `text-white/X`, `bg-white/X`, `border-white/X` utilities across 45 files with semantic tokens (`foreground-strong`, `foreground-muted`, `muted`, `faint`, `card`, `card-hover`, `overlay`, `overlay-strong`, `accent`, `info`)
- Tokens defined twice in `src/app/globals.css`: as CSS custom properties under `:root` (light) / `.dark`, and exposed as Tailwind utilities via a `@theme inline` block (Tailwind v4 native)
- Primary action buttons migrated from generic `bg-blue-600` to `bg-accent` (brand green); informational accents kept on `info` (blue)
- Recharts components (`SnapshotChart`, `ClientTrendChart`, `BandwidthTrendChart`) now use CSS variables for axes, grids, and tooltips so they render correctly in both themes

**Typography**
- Inter (sans) and JetBrains Mono via `next/font/google`, replacing the previous Arial fallback
- Bound to `--font-sans` / `--font-mono`; page headings standardized on `text-2xl font-bold tracking-tight text-foreground-strong`

**Dashboard restructure**
- Row 1: AI health card (2/3 wide) + Alerts Summary (1/3) — verdict on top, glanceable
- Row 2: Stat cards
- Row 3: Single tabbed Trends panel collapsing the three previous trend charts (Health / Clients / Bandwidth) behind a segmented control
- Row 4: Live event feed
- Deleted dead `NetworkInsight` placeholder

**AI surfaces**
- `HealthScoreCard` auto-runs on network change with skeleton loader, accent-tinted gradient background, sparkle icon, and explicit refresh button
- Brand-aware styling applied to `DeviceList` AI Diagnose modal and `AlertsList` AI Recommendations panel
- `DiagnoseModal` render-phase side effect (`void runDiagnosis()` during render) moved into a proper `useEffect` and given Escape-to-close + click-outside-to-close

**Sidebar grouping**
- 17 flat nav items grouped into 4 sections: Monitor / Inventory / By product / Tools
- Section labels styled as small uppercase tracking-wider faint headers

**Polish**
- `MarkdownOutput` fully tokenized (used by all AI surfaces)
- Login page uses `bg-background` instead of hardcoded hex
- Data tables (`DeviceList`, `ClientTable`) got bigger status dots with ring-2 for visibility, status-row tinting for alerting/offline rows, right-aligned numeric columns with `tabular-nums`
- Empty states use centered card layouts with tokens instead of bare faint text

### Meraki API hardening

**In-memory TTL cache** (`src/lib/meraki/cache.ts`)
- New cache utility with inflight-request coalescing and HMR-survival via `globalThis` anchor
- Routes covered:
  - `/api/meraki/organizations` — 10 min
  - `/api/meraki/networks` — 5 min
  - `/api/meraki/devices?networkId=` — 60 s
  - `/api/meraki/devices?orgId=` (statuses) — 30 s
  - `/api/meraki/clients?networkId=` — 30 s
  - `/api/meraki/alerts` — 2 min
  - `/api/meraki/events` — 15 s
  - `/api/meraki/firmware` — 2 min
  - `/api/meraki/overview` — 30 s
  - `/api/meraki/cameras` — 60 s
  - `/api/meraki/cameras/[serial]/snapshot` — 5 s coalesce
- Cache hits/misses logged with TTL remainder for observability
- Eliminated the 429 storm caused by every browser tab refetching org/network/device data on mount

**Bounded 429 retries**
- `merakiFetch` now caps 429 retries at 4 attempts with exponential backoff (max 8 s per wait), throwing if exhausted
- Replaces the previous unbounded recursion that could silently hang requests for minutes
- Each retry logged so rate-limit pressure is visible

### Streaming switches

**NDJSON response**
- `/api/meraki/switches` now returns a `ReadableStream` of `application/x-ndjson` with typed `SwitchStreamEvent` envelopes (`start`, `switch`, `error`, `done`, `fatal`)
- Server-side concurrency capped at 4 to stay under Meraki's 10 req/s limit; per-switch timings logged
- Each switch's `{ ports, statuses }` emitted as soon as both inner calls resolve

**Live UI**
- `SwitchPortTable` consumes the stream via a custom `useSwitchStream` hook
- Progress bar ("Loading switches — N of M, X%") ticks up live as data arrives
- Switch sections render as each switch completes (sorted by name once present)
- ~9 s for 28 switches with progressive feedback instead of one blocking spinner
- Soft warning banner if any switches failed (with refresh hint)

### Live camera snapshots

**Per-camera snapshot endpoint**
- New `/api/meraki/cameras/[serial]/snapshot` returns a single fresh snapshot URL with 5 s coalesce cache

**Auto-refreshing cards**
- Each `CameraCard` polls its own endpoint on a 20 s interval
- Staggered start (1.5 s × index) so cards don't all hit Meraki at the same instant
- Polling pauses when the browser tab is hidden (`visibilitychange` listener), resumes on focus
- Offline cameras don't poll
- "● Live" pill flashes in the corner while a snapshot is in flight; manual refresh button preserved

**Preload-before-swap (no flicker)**
- Meraki returns snapshot URLs immediately but the JPEG takes a few seconds to become available — previously this caused `<img>` 404s, `onError` flicker, and "No preview" flashes between every interval
- New `preloadImage(url)` helper preloads the image off-screen with up to 4 retries × 1.5 s delays
- Visible `<img>` is only swapped once the new image actually loads
- Previous snapshot stays on screen throughout — no flash, no "No preview" flicker
- Initial mount also goes through preload; shows "Loading snapshot…" spinner until the JPEG resolves
- "No preview available" now only appears for cameras that genuinely never produced a working snapshot

### Bug fixes

- `DiagnoseModal`: moved auto-run side effect from render phase to `useEffect` (was firing twice in strict mode)
- `AlertLog`: fixed `border border-b border` artifact from mechanical token migration
- `NetworkSelector` / `OrgSelector` dropdowns no longer hardcode `bg-gray-900` — now use `bg-card` so they render correctly in light mode
- `KeyboardShortcutsModal` and `ClientDetailPanel` migrated to tokens

---

## v0.6.0 — 2026-05-15

### New features

**PWA / Installable browser app**
- Added `public/manifest.json` with standalone display, theme color, and icons
- Browser "Install App" prompt appears automatically for supported browsers

**Per-user dark mode preference**
- Theme preference is now persisted in a `smrt-theme` cookie, eliminating flash-of-unstyled-content on reload
- Preference survives browser restarts and syncs across tabs

**Keyboard shortcut reference (?)**
- Press `?` anywhere (not in an input) to toggle a keyboard shortcuts overlay
- Lists: Ctrl+K (search), ?, Esc, ↑/↓, Enter

**Clickable network names**
- Network name in Alert History rows navigates to the Dashboard with that network selected
- Network name badge in Event Feed header links to the Traffic/Topology page

**Bandwidth trend chart**
- New "Bandwidth Trend" chart on the Dashboard plots sent/received bytes over the last 48 snapshots
- Data captured automatically every 5 minutes alongside device health

**MG cellular gateway panel**
- New `/cellular` page showing all MG cellular gateway uplink statuses
- Displays provider, connection type, IP, RSRP/RSRQ signal strength with visual bar
- Scoped to selected network or shows all

**MT sensor readings panel**
- New `/sensors` page displaying live MT sensor data (temperature, humidity, door, CO₂)
- Color-coded metric badges with thresholds (e.g. red above 35°C, blue above 70% RH)
- Refreshes every 30 seconds

**MV camera thumbnail previews**
- New `/cameras` page with live snapshot thumbnails for all MV cameras in the selected network
- Shows camera status badge, LAN IP, model, serial, and direct video link
- Individual and bulk refresh buttons

**Org-wide health summary email**
- New scheduled email summarising all network health scores in a single message
- Configurable schedule (daily at 8am / Monday at 8am) and optional override recipient
- Shows overall org score, per-network breakdown sorted by health, offline/alerting counts

**Natural language alert creation**
- New "Create Alert with AI" panel on the Alerts page
- Describe an alert in plain English (e.g. "Alert me on Slack when RJW HQ drops below 75%")
- Claude parses the intent, extracts network, threshold, and channel with a confidence rating
- One-click apply saves the threshold to config

**Per-network report recipients**
- Configure a different email address per network for scheduled reports
- Falls back to global SMTP "To" if no per-network recipient is set
- Managed in Settings → Per-Network Report Recipients

**Per-device uplink history in topology hover panel**
- Hovering over an MX/Z-series appliance in the topology view shows a 1-hour WAN1 sparkline
- Displays average latency and packet loss inline; loads asynchronously without blocking the map

**macOS packaging**
- `npm run build:mac` produces `dist/SmrtNetwork-mac` using caxa
- Config stored in `~/Library/Application Support/SmrtNetwork/`

**Linux packaging**
- `npm run build:linux` produces `dist/SmrtNetwork-linux` using caxa
- Config stored in `~/.config/SmrtNetwork/` (respects `XDG_CONFIG_HOME`)
- Falls back through `xdg-open` → `sensible-browser` → console URL

### Sidebar additions
- Cellular (MG), Sensors (MT), Cameras (MV) nav items added between VPN and Alerts

---

## v0.5.0 — 2026-05-14

### New features

**Integrations — ServiceNow**
- Auto-creates a ServiceNow incident when a network health alert fires (below threshold + cooldown elapsed)
- Configurable: instance URL, username, password, assignment group, category, and CMDB CI
- Test Connection button in Settings validates credentials without creating a ticket
- Incident details include network name, health score, threshold, device counts, and client count

**Integrations — Jira**
- "Create Jira Issue" button in the device AI Diagnosis modal posts the device info and Claude's analysis to Jira
- Configurable: Jira URL, email, API token, project key, and issue type (default: Bug)
- Test Connection button verifies the API token by calling `/rest/api/2/myself`
- Enabled via toggle in Settings → Jira panel

**Integrations — InfluxDB**
- Writes `network_health` line-protocol metrics to InfluxDB on every 5-minute poll (even when alerting is disabled)
- Supports InfluxDB v2 (token auth, org + bucket) and v1 (user/pass + database)
- Test Connection button checks `/health` (v2) or `/ping` (v1)
- Metrics: `healthScore`, `online`, `offline`, `alerting`, `dormant`, `total`, `clientCount` — tagged by `network_id` and `network_name`

**Integrations — Generic health webhook**
- POSTs a structured JSON payload to any URL(s) when a health alert fires
- Payload: `{ event, timestamp, network: { id, name, healthScore, threshold }, stats: { online, offline, alerting, dormant, total, clientCount } }`
- Comma-separate multiple URLs to fan out to several endpoints

**Client tagging**
- Tag any client with a **label** and optional **group** (stored in `data/client-tags.json`, keyed by MAC)
- Manage tags inline in the Client Detail Panel — add, edit, or remove without leaving the panel
- Tag badge (label · group) shown in the ClientTable name column
- Group filter dropdown in the toolbar filters by any group that has tagged clients
- Label and group included in search and in CSV export (two new columns)
- Tag context injected into the Claude AI client analysis prompt

**Alert log enhancements**
- New channel types: `webhook` and `servicenow` tracked alongside email/slack/teams
- Channel badge colors: orange for webhook, green for ServiceNow

### Settings additions
- ServiceNow, Jira, InfluxDB, and generic health webhook each get a dedicated panel
- Each panel has an enable toggle, credential fields, and a Test Connection button
- Integrations persist in `smrt-config.json` alongside all other settings

---

## v0.4.0 — 2026-05-14

### New features

**LDAP / Active Directory authentication**
- Settings → LDAP / Active Directory panel: enable toggle, LDAP URL, Base DN, optional service account DN and password, user filter template, admin group DN, read-only group DN
- Authentication flow: service account bind → user search → password bind → `memberOf` check
- If no groups are configured, any valid directory user gets admin access; if only the admin group is set, users outside it are denied
- Login page shows a Username field when LDAP is enabled; leaving it blank falls back to PIN auth

**Role-based access control**
- Two roles: **admin** (full settings access) and **read-only** (view everything, no changes)
- Session cookie format: `"admin:<hash>"` or `"readonly:<hash>"` — role is server-verified on every request
- Read-only users see a yellow banner in Settings; all save/write buttons disabled
- Backward-compatible: old session cookies still accepted and grant admin role

**Read-only PIN**
- Settings → Security: set a separate read-only password that grants view-only access
- Remove the read-only password via the "Remove" button

**Session timeout**
- Configurable in Settings → Security (1–365 days; default 7)
- Both admin and read-only sessions respect the same timeout

**Audit logging**
- All settings saves, login attempts, and password changes are written to `data/audit-log.json`
- Max 1,000 entries (newest-first FIFO); exported as CSV from Settings → Audit Log
- Admin-only "Clear" button; read-only users can view but not clear

---

## v0.3.0 — 2026-05-14

### New features

**Per-network HTML reports**
- "Network Report" button on the Dashboard generates a device + client report for the selected network
- Distinct from the existing org-wide health report
- Reports saved to report history automatically

**Report history**
- Last 15 generated reports stored in `data/report-history.json`
- History dropdown on the Dashboard Report button to re-open any previous report
- Reports served from `/api/report/history?id=X`

**Multiple Slack / Teams webhook URLs**
- Comma-separate multiple URLs in Settings to send alerts to several Slack channels or Teams channels simultaneously
- Poller sends to all configured endpoints; test button tests the first URL

**Per-network alert threshold overrides**
- New "Per-Network Alert Thresholds" section in Settings
- Set a custom health threshold per network; leave blank to use the global default
- Poller applies the per-network threshold with global-threshold fallback

**Client count trend chart**
- Dashboard shows a 24-hour connected-client count chart alongside the health score chart
- Poller now fetches real client counts (5-minute active window) and writes them to snapshots

---

## v0.2.0 — 2026-05-14

### New features

**Network topology map**
- New `/topology` page — SVG canvas showing all devices in the selected network grouped by type: Firewalls/Routers → Switches → Access Points → other categories
- Nodes are color-coded by live status (green = online, yellow = alerting, red = offline, gray = unknown)
- Dashed connection lines from each device to its nearest parent layer
- Hover tooltip shows device name, model, serial, LAN/WAN IPs, and status
- Summary chip bar with per-status counts and total device count
- Added "Topology" to sidebar navigation

**Historical trending**
- WAN Uplink Health chart now has a `1h / 6h / 24h / 7d / 30d` timespan selector
- API resolution auto-scales with the selected window (60 s for 1 h → 3600 s for 7 d/30 d)
- Chart subtitle updates to reflect the currently selected window

**PDF report export**
- New "Download PDF" button on the Overview page opens the HTML report in a new browser window and triggers the browser print dialog (save as PDF)
- Original "Download HTML" button behavior unchanged
- No additional dependencies — uses the browser's native print-to-PDF

**Alert muting / maintenance windows**
- New control in Settings: date/time picker to mute all alert notifications until a specific time
- Background poller skips SMTP / Slack / Teams notifications when alerts are muted
- "Clear Mute" button removes the mute immediately
- Mute state stored in `smrt-config.json` (`alertMutedUntil` field) and survives restarts

**Snapshot pruning**
- Background poller now automatically removes snapshots older than 30 days
- Hard cap of 2,000 entries as a secondary guard
- No manual intervention required — pruning runs on every poller cycle

**Client detail panel improvements**
- Active / Inactive badge in the panel header (green pill if last seen within 15 minutes, gray otherwise)
- 3-column quick-stats bar: Total Usage · Days Seen · Access Point
- Action buttons updated to brand green

**Firmware release note links**
- Firmware version cells in the Firmware Audit table now link to the Meraki release notes page for each product category (wireless, switch, appliance, cellular gateway, camera, sensor)
- External link icon appears on hover

**Multi-recipient SMTP (documentation fix)**
- UI now shows a comma hint under the "To" field confirming comma-separated addresses are accepted
- Nodemailer natively supports this — no backend change required

---

## v0.1.1 — 2026-05-14

BuildITSmrt branding release.

### Changes
- Applied BuildITSmrt, LLC. brand identity throughout the application
- Sidebar header: company logo and name replace the plain text header
- Login page: logo image, brand-green sign-in button and focus ring
- Dark theme: custom CSS variables (`--background: #0d1020`, `--card: #131728`, `--accent: #1e9c4a`)
- Light theme: updated foreground and background to match brand navy/off-white palette
- Browser tab title and meta description updated to include "BuildITSmrt"
- Brand assets added to `public/`: `favicon.ico`, `favicon.png`, `logo-mark.png`, `logo-banner.png`, `logo.svg`
- Sidebar active nav item color updated to brand green (`#1e9c4a`)
- Version bumped to `0.1.1` in `package.json` and `src/lib/version.ts`

---

## v0.1.0 — 2026-05-14

First public release.

### Features

**Core dashboard & monitoring**
- Network health score (0–100) with letter grade
- Stat cards: total devices, online, offline/alerting, connected clients
- 24-hour health snapshot trend chart
- Live event feed (Meraki network events)
- Background poller (every 5 minutes) with status indicator
- On-demand HTML report generation with optional email delivery

**Device & client visibility**
- Full org-level device table sorted by health status
- Device detail panel with AI diagnosis (loss/latency + client history)
- Client list with manufacturer, OS, SSID, usage — up to 1000 clients (full Meraki pagination)
- Global search (Cmd+K / Ctrl+K) across networks, devices, and clients

**Traffic & infrastructure**
- Top 25 clients by bandwidth (30-second refresh)
- Bandwidth summary across 1h / 6h / 24h / 7d periods
- WAN uplink health chart (loss % and latency)
- Per-switch port tables (all switches, all ports, no row caps)
- Wireless SSID list, connection pipeline funnel, per-AP channel utilization
- Org-wide AutoVPN status with per-tunnel reachability

**AI features**
- Health analysis with prioritized issue list and remediation steps
- Per-device diagnosis
- Traffic anomaly analysis
- Multi-turn natural-language chat with streaming responses

**Alerts & notifications**
- Alert log with full history (JSON-backed, CSV export)
- Slack webhook notifications
- Microsoft Teams webhook notifications
- Configurable health threshold and per-network cooldown

**Organization management**
- Multi-org support — switch between Meraki organizations
- Network compare (side-by-side health + AI narrative)
- Snapshot history for trend analysis

**Firmware audit**
- Org-wide firmware version breakdown grouped by product type
- Baseline / outdated badges, mixed-version warnings

**Security & access**
- Optional app-level password (SHA-256 hashed, 7-day session cookie)
- All API keys stored server-side only

**Export**
- CSV export for clients, devices, and alert log (UTF-8 BOM for Excel)

**Packaging**
- Portable Windows `.exe` (caxa + embedded Node.js runtime)
- Silent VBS launcher for no-console-window operation
- Auto-update banner when a new GitHub release is detected

**UI**
- Dark / light mode toggle
- Mobile-responsive layout
- Collapsible sidebar

### Bug fixes (pre-release)

- EventFeed: returns empty list (instead of error) for Meraki networks that don't support the events API
- Client list: fixed Meraki default pagination (was 10 rows) by requesting `perPage=1000`
- TrafficChart / switches: removed artificial row caps (was limited to 10 / 5)
- Connection pipeline: corrected endpoint from `/wireless/clients/connectionStats` (per-client array) to `/wireless/connectionStats` (aggregate)
- Firmware audit: switched from `/devices/statuses` (no firmware field) to `/organizations/{orgId}/devices` (full inventory with firmware)
- Launcher: fixed `ReferenceError: version is not defined` — version string was not interpolated into the caxa launcher template
- Launcher: added `process.chdir(__dirname)` before starting the Next.js server to ensure asset path resolution
- Proxy: renamed `middleware.ts` → `proxy.ts` per Next.js 16 file convention
- Update banner: moved from dashboard page to root layout so it appears on every page
