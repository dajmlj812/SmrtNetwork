# SmrtNetwork

Cisco Meraki network intelligence powered by Claude AI. SmrtNetwork connects to the Meraki Dashboard API, scores your network health in real time, surfaces issues before they become outages, and lets you ask plain-English questions about devices and traffic.

## Quick start (portable exe)

1. Download `SmrtNetwork.exe` from the [latest release](https://github.com/dajmlj812/SmrtNetwork/releases/latest)
2. Double-click to run — no Node.js or installation required
3. The app opens in your browser at `http://localhost:3000`
4. Go to **Settings** and enter your Meraki and Anthropic API keys

Config and data are stored in `%APPDATA%\SmrtNetwork\` on the host machine.

## Quick start (Docker)

```bash
cp .env.example .env   # fill in MERAKI_API_KEY and ANTHROPIC_API_KEY
docker compose up -d
```

Then browse to `http://localhost:3000`. The image is published on Docker Hub as `dajmlj812/smrtnetwork`. See [Docker docs](docs/DOCKER.md) for env vars, volumes, and publishing.

## Running from source

```bash
git clone https://github.com/dajmlj812/SmrtNetwork.git
cd SmrtNetwork
npm install
cp .env.local.example .env.local   # add your API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key features

| Area | What it does |
|---|---|
| Dashboard | Health score, stat cards, snapshot trends, live event feed, HTML + PDF reports |
| Topology | SVG device map — status-colored nodes grouped by type, hover for device details |
| Devices | Search by MAC/IP, full client history, AI-powered diagnosis |
| Clients | Network-wide client list with usage, OS, manufacturer, detail panel |
| Traffic | Top talkers, bandwidth trends, WAN uplink history (1h – 30d timespan selector) |
| Wireless | SSID status, channel utilization, connection pipeline funnel |
| Switches | Per-port status, speed, PoE usage, client count |
| VPN | Site-to-site tunnel reachability across the org |
| Alerts | AI recommendations, alert log, Slack/Teams webhooks, maintenance window muting |
| Firmware | Org-wide firmware audit with release note links per product type |
| Chat | Natural-language Q&A about your network via Claude |
| Settings | API keys, SMTP email, webhooks, scheduled reports, alert muting, password lock |

## Documentation

| Document | Description |
|---|---|
| [Installation Guide](docs/INSTALLATION.md) | Exe, dev server, and source build options |
| [Docker Guide](docs/DOCKER.md) | Container deployment, env vars, volumes, publishing |
| [Admin Guide](docs/ADMIN-GUIDE.md) | Configuration, security, alerting, reports |
| [Features](docs/FEATURES.md) | Full feature reference |
| [Changelog](docs/CHANGELOG.md) | Version history |
| [Roadmap](docs/ROADMAP.md) | Planned features |
| [Known Bugs](docs/KNOWN-BUGS.md) | Current known issues |

## Tech stack

Next.js 16 · TypeScript · shadcn/ui · Tailwind CSS · TanStack Query · Recharts · Anthropic SDK (`claude-sonnet-4-6`) · Cisco Meraki Dashboard API v1 · caxa (Windows exe packaging)

## License

MIT
