# Roadmap

Features planned for future releases. Priority order within each version is approximate.

---

## v0.8.0 — Upcoming

*(No confirmed scope yet — backlog items below are candidates)*

---

## Backlog (unscheduled)

- Windows code signing (removes SmartScreen prompt; requires ~$300–500/yr cert)
- SNMP trap receiver for Meraki alerts (not practical in Next.js; would require a separate service)
- Stale-while-revalidate for Meraki cache — serve cached data instantly, refresh in background
- Move cache layer down into the Meraki client itself so the poller and direct callers also benefit (currently route-level only)
- Inline live camera video (HLS via server-side RTSP transcode) — replaces auto-refreshing snapshots with true live video
- Cache hit/miss metrics surfaced in Settings → Health for tuning TTLs

---

## Shipped

### v0.7.0
- Semantic token-based theming — light mode now works correctly (replaced ~660 hardcoded white-opacity utilities)
- Inter + JetBrains Mono via `next/font/google`
- Dashboard restructured for NOC priority — AI health + alerts on top, single tabbed Trends panel
- Sidebar grouped into Monitor / Inventory / By product / Tools
- AI surfaces auto-run with distinctive accent-gradient treatment (HealthScoreCard, AlertsList recommendations)
- In-memory Meraki cache layer (`src/lib/meraki/cache.ts`) with inflight coalescing and HMR-survival
  - Routes cached: organizations (10m), networks (5m), devices (60s), device statuses (30s), clients (30s), alerts (2m), events (15s), firmware (2m), overview (30s), cameras (60s), per-camera snapshot (5s)
- 429 retries bounded to 4 attempts with exponential backoff (fail loudly instead of hanging)
- `/api/meraki/switches` streams NDJSON; UI renders rows + live progress bar as data arrives
- Per-camera `/api/meraki/cameras/[serial]/snapshot` endpoint with auto-refresh
  - Cards refresh on a 20 s staggered interval, paused when tab is hidden
  - Preload-before-swap eliminates flicker / "No preview" flash

### v0.6.0
- macOS packaging (`npm run build:mac` → `dist/SmrtNetwork-mac`)
- Linux packaging (`npm run build:linux` → `dist/SmrtNetwork-linux`)
- PWA manifest — installable from browser
- MG cellular gateway panel (`/cellular`) — signal strength, provider, RSRP/RSRQ
- MT sensor readings panel (`/sensors`) — temperature, humidity, door, CO₂
- MV camera thumbnail previews (`/cameras`) — live snapshots, video link
- Org-wide health summary email (daily or weekly, configurable recipient)
- Natural language alert creation with Claude intent parsing
- Per-user dark mode preference (cookie-backed, no FOUC)
- Keyboard shortcut reference (? key)
- Clickable network names in Alert History and Event Feed
- Bandwidth trend chart on Dashboard (sent/recv bytes from snapshots)
- Per-device uplink history sparkline in topology hover panel
- Per-network report recipients (override SMTP "To" per network)
- Scheduled per-network reports (uses per-network recipient if set)

### v0.5.0
- ServiceNow: auto-creates incident when health alert fires (configurable group/category/CMDB CI)
- Jira: "Create Jira Issue" from device AI diagnosis modal
- InfluxDB: time-series health metrics written on every 5-minute poll (v1 and v2 support)
- Generic health webhook: JSON POST to any URL(s) on health alert
- Client tagging: label + group per MAC, inline edit panel, badge in table, group filter, CSV columns, AI context injection
- Alert log channel types extended: webhook, servicenow

### v0.4.0
- LDAP / Active Directory authentication with group-based role assignment
- Role-based access: admin vs. read-only; read-only users see everything but cannot change settings
- Read-only PIN — separate password for view-only access
- Session timeout configuration (1–365 days)
- Audit logging: all logins, settings saves, and password changes (last 1,000 entries, CSV export)

### v0.3.0
- Per-network HTML report with device + client data; saved to report history
- Report history: last 15 reports accessible from the Dashboard Report button
- Multiple Slack / Teams webhook URLs (comma-separated)
- Per-network alert threshold overrides in Settings
- Client count trend chart on the dashboard (24-hour history from poller snapshots)

### v0.2.0
- Network topology map (SVG, status-colored nodes, layer grouping, hover tooltips)
- WAN uplink history timespan selector (1h / 6h / 24h / 7d / 30d)
- PDF report export (browser print dialog)
- Alert muting / maintenance windows
- Automatic snapshot pruning (30-day retention, 2,000-entry cap)
- Multi-recipient SMTP (comma-separated To addresses)
- Client detail panel improvements (active badge, quick-stats bar)
- Firmware release note links per product type

### v0.1.1
- BuildITSmrt, LLC. branding applied throughout

### v0.1.0
- Initial release — see [CHANGELOG.md](CHANGELOG.md) for full feature list
