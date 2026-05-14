# SmrtNetwork

An AI-powered network intelligence dashboard for Cisco Meraki environments. SmrtNetwork connects to the Meraki Dashboard API and uses Claude AI to analyze network health, diagnose device issues, explain traffic patterns, and answer natural language questions about your infrastructure.

---

## Features

### Organization Overview
- Grid view of all Meraki networks in the organization, color-coded by health score
- Device counts (online / offline / alerting) per site
- Click any network card to select it and drill in
- Auto-refreshes every minute

### Network Dashboard
- Live stat cards: total devices, online, offline/alerting, connected clients
- AI-powered health assessment — Claude analyzes your devices, clients, and alerts and returns a prioritized issue list with remediation steps
- Generate downloadable HTML reports; optionally email them on a schedule

### Device Lookup
- Search any device or client by MAC address or IP
- Full device table for the selected network (sorted by health: alerting → offline → online)
- Per-device AI diagnosis using loss/latency history and client data

### Traffic & Flow
- Real-time horizontal bar chart of top 10 clients by bandwidth (auto-refreshes every 30s)
- AI traffic analysis: identifies top talkers, unusual patterns, and QoS recommendations
- WAN uplink health chart for MX/Z appliances — plots packet loss % and latency over 24 hours

### Switch Ports
- Per-switch collapsible port tables for all MS switches in the network
- Columns: status, speed, VLAN, PoE draw, client count, uplink flag
- Disconnected non-uplink ports highlighted in red

### Wireless Health
- Enabled SSID cards with auth mode and encryption details
- Connection quality pipeline (association → auth → DHCP → DNS → success) with color-coded drop indicators
- Per-AP channel utilization bars for 2.4 GHz and 5 GHz

### VPN Status
- Org-wide AutoVPN table showing all MX appliances, their role (hub/spoke), and peer counts
- Expandable peer list with reachability status per tunnel

### Ask AI (Chat)
- Multi-turn natural language chat powered by Claude
- Network context (devices, clients, alerts) is automatically injected into every conversation
- Streaming responses rendered as formatted markdown
- Starter prompts: "What devices are offline?", "Who is using the most bandwidth?", etc.

### Alerts
- Enabled and disabled alert profiles for the selected network
- Default notification destinations (All Admins, SNMP, email)
- AI recommendations for alert coverage gaps

### Settings
- Update Meraki API key, Anthropic API key, and Meraki Base URL through the UI — no server restart required
- SMTP configuration for email reports with a built-in **Send Test Email** button

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| UI components | shadcn/ui patterns + lucide-react icons |
| Data fetching | TanStack Query (React Query v5) |
| Charts | Recharts |
| AI | Anthropic SDK (`claude-sonnet-4-6`) with prompt caching |
| Email | Nodemailer |
| Network API | Cisco Meraki Dashboard API v1 |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Cisco Meraki Dashboard API key](https://documentation.meraki.com/General_Administration/Other_Topics/The_Cisco_Meraki_Dashboard_API)
- An [Anthropic API key](https://console.anthropic.com)

### Installation

```bash
git clone https://github.com/your-org/smrt-network.git
cd smrt-network
npm install
```

### Configuration

Copy the environment file and add your keys:

```bash
cp .env.local.example .env.local
```

```env
# Cisco Meraki
MERAKI_API_KEY=your_40_char_hex_key
MERAKI_BASE_URL=https://api.meraki.com/api/v1

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...
```

Alternatively, keys can be set and updated at any time through the **Settings** page in the UI — they are stored in `smrt-config.json` and take effect immediately without a restart.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
  app/
    api/
      meraki/          # Meraki API proxy routes (keeps keys server-side)
      analyze/         # Claude analysis endpoints
      chat/            # Streaming chat endpoint
      report/          # Report generation + email
      settings/        # Config read/write + SMTP test
    overview/          # Org-wide NOC view
    dashboard/         # Network health dashboard
    devices/           # Device lookup and list
    network/           # Traffic, uplink health
    switches/          # Switch port view
    wireless/          # Wireless health
    vpn/               # VPN status
    alerts/            # Alert profiles
    chat/              # AI chat interface
    settings/          # API key + SMTP configuration
  components/
    dashboard/         # Stat cards, health card, report button
    devices/           # Device list, device detail, search
    network/           # Traffic chart, uplink chart, top talkers
    switches/          # Switch port table
    wireless/          # Wireless dashboard
    vpn/               # VPN table
    overview/          # Network grid
    alerts/            # Alerts list
    chat/              # Chat panel
    layout/            # Sidebar, network selector
    ui/                # Shared: MarkdownOutput
    providers/         # QueryProvider
  lib/
    meraki/            # Typed Meraki API client + types
    claude/            # Anthropic SDK wrapper + system prompts
    context/           # NetworkContext (selected org/network)
    config.ts          # Runtime config (smrt-config.json + env fallback)
    utils.ts           # cn(), formatBytes(), formatLatency()
```

---

## Architecture Notes

**All API keys stay server-side.** Meraki and Anthropic calls are made exclusively from Next.js Route Handlers. Client components only call `/api/*` endpoints.

**Prompt caching.** The Claude system prompt and static network context are marked `cache_control: ephemeral` to reduce token cost on repeated analysis calls.

**Rate limiting.** The Meraki client automatically retries on HTTP 429 with the `Retry-After` delay. Batch endpoints (e.g., org-wide device statuses) are preferred over per-network loops wherever the API supports them.

**Runtime config.** Keys saved through the Settings UI are written to `smrt-config.json` (gitignored). The app reads from this file first and falls back to environment variables, so `.env.local` serves as the default and the UI overrides without a restart.

---

## Email Reports

Configure SMTP in **Settings → Email Reports**. Supported providers:

| Provider | Host | Port |
|---|---|---|
| Office 365 | `smtp.office365.com` | `587` |
| Gmail | `smtp.gmail.com` | `587` |
| SendGrid | `smtp.sendgrid.net` | `587` |
| Custom SMTP | your server | `587` / `465` |

Use the **Send Test Email** button to verify your configuration before generating reports.

---

## License

MIT
