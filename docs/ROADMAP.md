# Roadmap

Features planned for future releases. Priority order within each version is approximate.

---

## v0.3.0 — Reporting & visualization

**Enhanced reports**
- Per-network report (current reports are org-wide)
- Scheduled reports per network with different recipients
- Report history — keep last N reports in `%APPDATA%\SmrtNetwork\`

**Visualization**
- Client count trend chart over time per network
- Bandwidth trend per network (sent/recv history from snapshots)
- Per-device uplink history exported to the topology hover panel

**Alerting**
- Multiple Slack / Teams webhook URLs (comma-separated or list UI)
- Per-network alert threshold overrides
- Alert log includes network name column in CSV export

---

## v0.4.0 — Security & enterprise

**Authentication**
- LDAP / Active Directory authentication option
- Role-based access (read-only vs admin)
- Session timeout configuration

**Code signing**
- Windows exe signed with a trusted certificate (removes SmartScreen prompt)

**Audit logging**
- Log all settings changes with timestamp and (if auth is enabled) user
- Exportable audit trail

---

## v0.5.0 — Integrations

**Ticketing**
- ServiceNow: auto-create incident when health score drops below threshold
- Jira: create issue from device diagnosis panel

**Monitoring platforms**
- Export health scores to InfluxDB / Grafana
- SNMP trap receiver for Meraki alerts
- Webhook outbound for any health event (generic JSON payload)

**Client tagging**
- Tag clients with a name or group (stored locally)
- Filter client list by tag
- Include tags in CSV export and AI context

---

## Backlog (unscheduled)

- macOS / Linux packaging (pkg or similar)
- Progressive Web App (PWA) manifest for installable browser experience
- Dark mode per-user preference when multiple users share an instance
- Meraki camera thumbnail previews (MV cameras)
- Cellular gateway (MG) signal strength and data usage panel
- MT sensor readings (temperature, humidity, door state)
- Organization health score summary email (one email covering all networks)
- Natural language alert creation ("alert me when Office Network goes below 70")
- Keyboard shortcut reference (? key)
- Clickable network names in event feed and alert log navigate to that network

---

## Shipped

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
