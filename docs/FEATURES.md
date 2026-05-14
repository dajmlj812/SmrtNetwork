# Features

## Organization Overview

- Grid view of all Meraki networks in the organization, color-coded by health score
- Device counts per site: online, offline, alerting
- Click any network card to select it and drill in
- Auto-refreshes every 60 seconds
- Supports multiple organizations — switch via Settings

## Dashboard

- **Health score card** — 0–100 score with letter grade, calculated from device status and alert counts
- **Stat cards** — total devices, online, offline/alerting, connected clients; refreshes every 60 seconds
- **Snapshot trend chart** — 24-hour health score history from background poller snapshots
- **Live event feed** — recent Meraki events for the selected network (association, VPN changes, reboots)
- **Poller status indicator** — shows whether the background health poller is running
- **Network Report** — generates a per-network device + client HTML report (separate from the org-wide report); saved to report history automatically
- **Report history** — last 15 generated reports accessible from a dropdown on the Report button; served from local storage
- **Download HTML** — generates a downloadable org-wide health report; optionally emails it if SMTP is configured
- **Download PDF** — opens the report in a new browser window and triggers the print dialog (save as PDF via browser)
- **Client count trend chart** — 24-hour chart of connected client counts alongside the health score trend
- **Update banner** — notifies when a newer version of SmrtNetwork is available on GitHub

## Network Topology

- SVG device map for the selected network, grouped by layer: Firewall/Router → Switch → Access Point → other categories
- Nodes color-coded by live status: green (online), yellow (alerting), red (offline), gray (unknown/dormant)
- Dashed connection lines drawn from each device to its nearest parent layer
- Hover any node to see: device name, model, serial, LAN IP, WAN IP, and status
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
- **CSV export** — download port data per switch

## VPN

- Org-wide AutoVPN table showing all MX appliances, their hub/spoke role, and tunnel peer counts
- Expandable peer list with reachability status (reachable / unreachable) per tunnel
- Third-party VPN peer status where configured

## Alerts

- **Active alerts** — enabled alert profiles for the selected network with notification destinations
- **Alert log** — history of all triggered health alerts with timestamp, network, score, channel, and message
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
- Stored locally in `%APPDATA%\SmrtNetwork\`

## Global Search (Cmd+K / Ctrl+K)

- Searches networks, devices, and clients by name, IP, or MAC in real time
- Keyboard-navigable results list
- Selecting a result navigates to the relevant page and selects the network

## Settings

| Section | Fields |
|---|---|
| API Keys | Meraki API Key, Anthropic API Key, Meraki Base URL |
| Active Organization | Dropdown of all orgs visible to the API key |
| Email Reports | SMTP host, port, credentials, from/to addresses (comma-separated), schedule (none/daily/weekly), test button |
| Notifications | Slack webhook URL(s), Teams webhook URL(s), test buttons |
| Alerting | Enable toggle, health threshold, cooldown minutes, per-network threshold overrides, alert muting |
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

## Integrations

| Integration | Trigger | What it does |
|---|---|---|
| ServiceNow | Health alert fires | Creates an incident with network details, score, and device counts |
| Jira | AI Diagnose → Create Jira Issue | Creates an issue with device info and Claude's diagnosis |
| InfluxDB | Every 5-minute poll | Writes `network_health` time-series metrics for Grafana |
| Health webhook | Health alert fires | POSTs JSON payload to any configured URL(s) |

## Dark / Light Mode

- Toggle between dark and light theme from the sidebar
- Persisted in browser local storage
- Defaults to dark mode

## CSV Export

Available on: Clients table, Devices table, Alert Log table. Files use UTF-8 BOM for correct Excel rendering.

## Portable Windows exe

- Single `.exe` file — no Node.js, no installer
- Embeds the Node.js runtime (same version used during build)
- Finds a free port in 3000–3099 automatically
- Opens the browser automatically after 3 seconds
- Config persists in `%APPDATA%\SmrtNetwork\` across runs
- `SmrtNetwork-Silent.vbs` launcher available for no-console-window operation
