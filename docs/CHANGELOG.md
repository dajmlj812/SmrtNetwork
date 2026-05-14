# Changelog

All notable changes to SmrtNetwork are documented here.

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
