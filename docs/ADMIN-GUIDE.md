# Admin Guide

## Initial setup

After first launch, go to **Settings** (gear icon in the sidebar) and configure:

1. **Meraki API Key** — required for all network data
2. **Anthropic API Key** — required for AI analysis and chat
3. **Active Organization** — select which Meraki org to monitor (auto-loaded after the API key is saved)

Settings are saved to `smrt-config.json` in the data directory and take effect immediately without a restart.

---

## API Keys

### Meraki

- Generate at: Meraki Dashboard → *your name (top right)* → **My Profile** → **API access**
- Read-only access is sufficient — SmrtNetwork never writes to the Meraki API
- The key is stored in `smrt-config.json` (not in any env file when set through the UI)

### Anthropic

- Generate at: [console.anthropic.com](https://console.anthropic.com) → **API Keys**
- Any active key works; `claude-sonnet-4-6` is used for all analysis
- Claude calls are made server-side — the key is never sent to the browser

### Rotating keys

Go to Settings → update the field → click **Save**. The new key takes effect on the next API call. No restart required.

---

## Multi-org support

If your Meraki account has access to multiple organizations:

1. Go to **Settings → Active Organization**
2. The dropdown lists all orgs visible to your API key
3. Selecting an org reloads all network data for that org

The selected org is persisted in `smrt-config.json` as `activeOrgId`.

---

## Password protection

Prevents unauthorized access when the app is exposed on a local network.

**Enable:**
1. Go to **Settings → Security**
2. Enter a new password and click **Set Password**
3. All future page loads require login (7-day session cookie)

**Disable:**
1. Go to **Settings → Security**
2. Click **Remove Password** (while logged in)

Passwords are stored as a SHA-256 hash in `smrt-config.json` — the plaintext is never saved.

> If you forget the password, delete `smrt-config.json` from `%APPDATA%\SmrtNetwork\` and restart. You will need to re-enter your API keys.

---

## Email reports

Sends an HTML health report via SMTP on a daily or weekly schedule.

**Configure:**

| Field | Description |
|---|---|
| SMTP Host | e.g. `smtp.office365.com` |
| Port | `587` (STARTTLS) or `465` (SSL) |
| Username | Your email address |
| Password | Email account password or app password |
| From | Sender address shown in the email |
| To | Recipient address (one address) |
| Schedule | None / Daily / Weekly |

Common providers:

| Provider | Host | Port |
|---|---|---|
| Office 365 | `smtp.office365.com` | `587` |
| Gmail | `smtp.gmail.com` | `587` |
| SendGrid | `smtp.sendgrid.net` | `587` |

Use **Send Test Email** to verify the configuration before enabling a schedule. Reports are generated on the server and do not require the browser to be open.

---

## Alerting

Sends a Slack or Teams message (or email) when the network health score drops below a threshold.

**Configure in Settings → Alerting:**

| Setting | Description |
|---|---|
| Enable alerting | Toggle alerts on/off |
| Health threshold | Score below this triggers an alert (default 80) |
| Cooldown | Minimum minutes between alerts for the same network (default 60) |
| Slack webhook URL | Incoming webhook URL from your Slack app |
| Teams webhook URL | Incoming webhook URL from your Teams channel |

The background poller runs every 5 minutes and evaluates the health score for the active network. Alerts are logged to `alert-log.json` regardless of the delivery channel.

**Test your webhooks** using the **Test** buttons in Settings before enabling alerting.

---

## Snapshots

SmrtNetwork automatically saves a health snapshot every 5 minutes (when the poller runs). Snapshots are stored as JSON in `%APPDATA%\SmrtNetwork\data\snapshots\`.

- The **Dashboard** shows a 24-hour trend chart from these snapshots
- The **Compare** page lets you pick two networks and compare their health scores side by side
- Snapshots accumulate indefinitely; there is currently no automatic pruning

---

## Data directory layout

```
%APPDATA%\SmrtNetwork\
  smrt-config.json        — all settings (API keys, SMTP, alerting, password hash)
  alert-log.json          — alert history (timestamp, network, score, message)
  data\
    snapshots\            — health snapshots (one JSON file per network per tick)
```

---

## Meraki API rate limits

The Meraki API allows 10 requests/second per organization. SmrtNetwork handles 429 responses automatically by waiting the `Retry-After` period and retrying. If you see slow load times on pages with many networks or devices, this is the Meraki API throttling — it will resolve on its own.

---

## Background poller

The poller runs on the server every 5 minutes (via `node-cron`) and:

1. Fetches device statuses and client counts for the active network
2. Calculates a health score
3. Saves a snapshot
4. Evaluates alert thresholds and sends notifications if triggered

The poller status is visible on the Dashboard (green dot = running, grey = idle). It starts automatically when the server starts and requires no configuration.
