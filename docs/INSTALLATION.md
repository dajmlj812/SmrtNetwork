# Installation Guide

## Option 1 — Portable Windows exe (recommended)

No Node.js or installation required. The exe bundles the Node.js runtime and the full application.

### Steps

1. Go to the [latest release](https://github.com/dajmlj812/SmrtNetwork/releases/latest)
2. Download `SmrtNetwork.exe` (180 MB)
3. Place it anywhere — a shared drive, your desktop, a USB stick
4. Double-click to launch

The app starts a local web server and opens your default browser at `http://localhost:3000`. A console window shows the URL and port.

### Silent launcher (no console window)

Download `SmrtNetwork-Silent.vbs` from the same release alongside `SmrtNetwork.exe`. Double-clicking the VBS file launches the app without a console window — suitable for startup tasks or non-technical users.

### Run at Windows startup

Copy `SmrtNetwork-Silent.vbs` to:
```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\
```
The app will start automatically every time you log in.

### Data directory

Config and network snapshots are stored in:
```
%APPDATA%\SmrtNetwork\
  smrt-config.json    — API keys, SMTP, alert settings
  data\               — network health snapshots
  alert-log.json      — alert history
```

### Windows SmartScreen

Because the exe is unsigned, Windows SmartScreen may show a blue "Windows protected your PC" dialog on first run. Click **More info → Run anyway**. This is expected for unsigned binaries and not a security risk for software you built yourself.

---

## Option 2 — Dev server (source)

For development or running on macOS/Linux.

### Prerequisites

- Node.js 18 or later
- A [Cisco Meraki Dashboard API key](https://documentation.meraki.com/General_Administration/Other_Topics/The_Cisco_Meraki_Dashboard_API)
- An [Anthropic API key](https://console.anthropic.com)

### Steps

```bash
git clone https://github.com/dajmlj812/SmrtNetwork.git
cd SmrtNetwork
npm install
```

Create `.env.local` in the project root:

```env
MERAKI_API_KEY=your_meraki_api_key_here
ANTHROPIC_API_KEY=sk-ant-api03-...
MERAKI_BASE_URL=https://api.meraki.com/api/v1
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Option 3 — Production build + exe

Use this to build a fresh exe from source with your changes included.

```bash
npm run build:exe
```

This runs `next build` then packages the standalone output into `dist/SmrtNetwork.exe` using caxa. Requires Node.js 18+ on the build machine. The build takes 3–5 minutes.

Output:
```
dist/
  SmrtNetwork.exe         — double-click to run (with console)
  SmrtNetwork-Silent.vbs  — double-click to run (no console)
```

> If the build fails with `EPERM: operation not permitted` on the exe, an older version of SmrtNetwork is still running. Close it and retry.

---

## Updating

### Exe

Download the new `SmrtNetwork.exe` from the latest release and replace the old one. Your config in `%APPDATA%\SmrtNetwork\` is untouched.

### Source

```bash
git pull
npm install
npm run dev   # or npm run build:exe
```

---

## API key requirements

| Key | Where to get it | Minimum permissions |
|---|---|---|
| Meraki API key | Dashboard → My Profile → API access | Read-only org access |
| Anthropic API key | console.anthropic.com | Any active key |
