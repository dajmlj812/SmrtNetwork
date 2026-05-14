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
- **Report button** — generates a downloadable HTML health report on demand
- **Update banner** — notifies when a newer version of SmrtNetwork is available on GitHub

## Devices

- Full device table for the selected network, sorted by health (alerting → offline → online)
- Columns: name, model, status, firmware, IP, MAC, network
- Search by MAC address or IP
- **Device detail panel** — click any device to see: model, serial, firmware, IPs, connected clients
- **AI diagnosis** — Claude analyzes loss/latency history and client data and returns a diagnosis with remediation steps

## Clients

- All clients seen on the selected network in the past 24 hours
- Columns: description, MAC, IP, SSID/AP, manufacturer, OS, usage (sent/recv), first/last seen
- Full list (up to 1000 clients) — no artificial row caps
- **CSV export** — download the full client list as a UTF-8 CSV (Excel-compatible)

## Traffic

- **Top talkers chart** — horizontal bar chart of top 25 clients by bandwidth; updates every 30 seconds
- **Bandwidth summary** — sent/received/total and client count across four periods: 1 hour, 6 hours, 24 hours, 7 days
- **AI traffic analysis** — identifies unusual patterns, top applications, and QoS recommendations
- **WAN uplink health** — loss % and latency over 24 hours for MX/Z appliances

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
- **Alert log** — history of all triggered health alerts with timestamp, network, score, and message
- **AI recommendations** — Claude reviews current alert coverage and suggests gaps or tuning
- **CSV export** — download the full alert log
- **Slack webhook** — sends alert notifications to a Slack channel
- **Teams webhook** — sends alert notifications to a Microsoft Teams channel

## Firmware Audit

- Org-wide view of firmware versions grouped by product type (wireless, switch, appliance, etc.)
- Collapsible section per product type showing all versions, device counts, and network counts
- **Status badges**: "Uniform" (all same version), "Baseline" (most common when mixed), "Potentially outdated" (minority versions)
- Mixed-version product types flagged with a yellow "N versions" badge

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
- Stored locally in `%APPDATA%\SmrtNetwork\data\snapshots\`

## Global Search (Cmd+K / Ctrl+K)

- Searches networks, devices, and clients by name, IP, or MAC in real time
- Keyboard-navigable results list
- Selecting a result navigates to the relevant page and selects the network

## Settings

| Section | Fields |
|---|---|
| API Keys | Meraki API Key, Anthropic API Key, Meraki Base URL |
| Active Organization | Dropdown of all orgs visible to the API key |
| Email Reports | SMTP host, port, credentials, from/to addresses, schedule (none/daily/weekly), test button |
| Alerting | Enable toggle, health threshold, cooldown minutes |
| Webhooks | Slack webhook URL, Teams webhook URL, test buttons |
| Security | Set/remove app password |

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
