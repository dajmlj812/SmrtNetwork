# Roadmap

Features planned for future releases. Priority order within each version is approximate.

---

## v0.6.0 — Platform & packaging

**Packaging**
- macOS packaging (pkg or similar)
- Linux packaging (AppImage or similar)
- Progressive Web App (PWA) manifest for installable browser experience

**Monitoring**
- Cellular gateway (MG) signal strength and data usage panel
- MT sensor readings (temperature, humidity, door state)
- Meraki camera thumbnail previews (MV cameras)

**Alerting & AI**
- Organization health score summary email (one email covering all networks)
- Natural language alert creation ("alert me when Office Network goes below 70")
- Per-user dark mode preference when multiple users share an instance

**UI polish**
- Keyboard shortcut reference (? key)
- Clickable network names in event feed and alert log navigate to that network

---

## Backlog (unscheduled)

- Windows code signing (removes SmartScreen prompt; requires ~$300–500/yr cert)
- SNMP trap receiver for Meraki alerts (not practical in Next.js; would require a separate service)
- Scheduled per-network reports with different recipients per network
- Bandwidth trend per network (sent/recv history from snapshots)
- Per-device uplink history exported to the topology hover panel

---

## Shipped

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
