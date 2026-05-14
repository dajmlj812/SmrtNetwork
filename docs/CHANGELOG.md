# Changelog

All notable changes to SmrtNetwork are documented here.

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
