# Known Bugs

## Active issues

### exe rebuild requires closing the running app

**Symptom:** `npm run build:exe` fails with `EPERM: operation not permitted, unlink 'dist/SmrtNetwork.exe'`

**Cause:** Windows locks the exe file while it is running. caxa cannot overwrite a locked file.

**Workaround:** Close the running SmrtNetwork instance before rebuilding. If the process is stuck, use Task Manager to end `SmrtNetwork.exe`, then retry the build.

---

### Windows SmartScreen blocks first run

**Symptom:** A blue "Windows protected your PC" dialog appears when double-clicking the exe.

**Cause:** The exe is unsigned (code-signing certificates cost ~$300–$500/year). Windows blocks unsigned executables from the internet by default.

**Workaround:** Click **More info → Run anyway**. This is a one-time prompt per exe file. The app is safe — you built it yourself from source.

**Fix planned:** Code signing in a future release once the project matures.

---

### Alert log email recipient is a single address

**Symptom:** The SMTP "To" field in Settings accepts only one email address.

**Cause:** The current config schema stores `smtpTo` as a plain string.

**Workaround:** Use a distribution list or group email address as the "To" value.

**Fix planned:** v0.2.0 — multi-recipient support via comma-separated addresses.

---

### EventFeed hidden for combined / template networks

**Symptom:** The recent events feed does not appear on certain networks.

**Cause:** Meraki returns HTTP 400 for the events API on combined networks and network templates. SmrtNetwork silently hides the component rather than showing an error, so there is no indication that events are unavailable for that network type.

**Workaround:** Events are only supported on standard networks. Select a non-template network to see the event feed.

---

### Snapshot pruning not implemented

**Symptom:** The `%APPDATA%\SmrtNetwork\data\snapshots\` directory grows indefinitely as the poller runs every 5 minutes.

**Cause:** No automatic cleanup logic has been implemented.

**Impact:** Negligible for the first few weeks (each snapshot is a few KB), but will accumulate over months.

**Fix planned:** v0.2.0 — automatic pruning of snapshots older than 30 days.

---

### Multi-recipient webhooks not supported

**Symptom:** Only one Slack webhook URL and one Teams webhook URL can be configured.

**Workaround:** Point the webhook at a channel that forwards to multiple destinations, or use Slack/Teams workflow automation.

**Fix planned:** v0.2.0.

---

## Fixed in v0.1.0

| Bug | Fixed in |
|---|---|
| Client list capped at 10 rows (Meraki default pagination) | v0.1.0 |
| Traffic chart and switch table capped at 10/5 rows | v0.1.0 |
| Connection pipeline showing no data (wrong API endpoint) | v0.1.0 |
| Firmware audit showing all devices as "unknown" firmware | v0.1.0 |
| Exe crash: `ReferenceError: version is not defined` in launcher | v0.1.0 |
| Update banner only visible on dashboard page | v0.1.0 |
| Next.js 16 middleware deprecation warning | v0.1.0 |
