# Changelog

All notable changes to SmrtNetwork are documented here.

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
