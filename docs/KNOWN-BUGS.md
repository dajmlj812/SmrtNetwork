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

### EventFeed hidden for combined / template networks

**Symptom:** The recent events feed does not appear on certain networks.

**Cause:** Meraki returns HTTP 400 for the events API on combined networks and network templates. SmrtNetwork silently hides the component rather than showing an error, so there is no indication that events are unavailable for that network type.

**Workaround:** Events are only supported on standard networks. Select a non-template network to see the event feed.

---

## Fixed in v0.7.3

| Bug | Fixed in |
|---|---|
| Session cookie missing `Secure` and `SameSite` flags — over HTTP it could leak in transit; without SameSite it could ride along on cross-site POSTs (CSRF) | v0.7.3 — shared `setSessionCookie()` helper sets `Secure` when the request actually arrived over HTTPS (or via `x-forwarded-proto: https`) and always sets `SameSite=Lax` + `HttpOnly` |
| No security response headers (no X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS); `X-Powered-By: Next.js` advertised framework | v0.7.3 — all five hardening headers set in `next.config.ts`; `poweredByHeader: false` |

## Fixed in v0.7.2

| Bug | Fixed in |
|---|---|
| **CRITICAL** — every `/api/*` route was reachable without authentication; cookie verification only ran in `layout.tsx` (page renders), not in middleware. Anyone with network reachability could read settings, audit log, full Meraki device/network inventory, and likely modify config + trigger AI analyses. | v0.7.2 — `proxy.ts` middleware now enforces `verifySession()` on every `/api/*` request except a narrow public allowlist (`/api/auth/{login,logout,config}`, `/api/poller/status`) |

## Fixed in v0.7.1

| Bug | Fixed in |
|---|---|
| Sidebar / global search / update banner were rendered on the unauthenticated `/login` page | v0.7.1 — login route now renders full-bleed without the app shell |

## Fixed in v0.7.0

| Bug | Fixed in |
|---|---|
| Light mode invisible — ~660 hardcoded `text-white/X` utilities made text disappear on white backgrounds | v0.7.0 — replaced with semantic tokens; both themes render correctly |
| Meraki rate-limit storm — every browser tab refetched orgs/networks on mount, hammering `/organizations` until 429s cascaded | v0.7.0 — in-memory TTL cache with inflight coalescing |
| Requests could hang indefinitely on Meraki 429s (unbounded retry loop) | v0.7.0 — 429 retries capped at 4 attempts; fail loudly within ~20 s |
| `/switches` page showed a single blocking spinner for 9+ s with no progress | v0.7.0 — NDJSON streaming + live progress bar; rows render as they arrive |
| Camera snapshots flickered to "No preview" on every refresh because Meraki returns the URL before the JPEG is ready | v0.7.0 — preload-before-swap; previous snapshot stays visible during refresh |
| `DiagnoseModal` fired `void runDiagnosis()` during render (double-fired in strict mode) | v0.7.0 — moved into `useEffect`, plus Escape/click-outside to close |
| `NetworkSelector` / `OrgSelector` dropdowns hardcoded `bg-gray-900`, stayed dark in light mode | v0.7.0 — uses `bg-card` token |
| Body font was `Arial, Helvetica, sans-serif` | v0.7.0 — Inter via `next/font/google` |

## Fixed in v0.6.0

| Bug | Fixed in |
|---|---|
| Dark mode preference lost on hard refresh (FOUC) | v0.6.0 — now cookie-backed |
| Topology hover panel had no live data (static text only) | v0.6.0 — uplink sparkline added for MX/Z |

## Fixed in v0.3.0

| Bug | Fixed in |
|---|---|
| Only one Slack / Teams webhook URL supported | v0.3.0 |

## Fixed in v0.2.0

| Bug | Fixed in |
|---|---|
| Snapshot directory grows indefinitely | v0.2.0 |
| SMTP To field accepts only one email address | v0.2.0 |

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
