# Roadmap

Features planned for future releases. Priority order within each version is approximate.

---

## v0.2.0 — Quality & polish

**Alerting improvements**
- Multi-recipient SMTP (comma-separated To addresses)
- Multiple Slack/Teams webhook URLs
- Per-network alert threshold overrides
- Alert muting / suppression windows (e.g., maintenance windows)

**Data management**
- Automatic snapshot pruning (default: keep 30 days)
- Manual snapshot export (ZIP download)
- Alert log export includes network name column

**Firmware audit**
- Link each firmware version row to the Meraki release notes URL
- "Upgrade available" badge using Meraki's recommended firmware API

**Usability**
- Multi-recipient email reports
- Client detail drill-down panel (similar to device detail)
- Clickable network names in the event feed and alert log
- Keyboard shortcut reference (? key)

---

## v0.3.0 — Visualization & reporting

**Network topology map**
- Visual graph of networks, devices, and uplinks
- Color-coded node health status
- Click a node to open the device detail panel

**Historical trending**
- Per-device uplink health history (selectable 1h / 24h / 7d / 30d)
- Client count trend over time per network
- Bandwidth trend per network

**Enhanced reports**
- PDF export option (in addition to HTML)
- Per-network report (current reports are org-wide)
- Scheduled reports per network with different recipients

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
