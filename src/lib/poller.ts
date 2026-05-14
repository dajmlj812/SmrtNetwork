import { meraki } from "./meraki/client";
import {
  getAlertingConfig,
  getNetworkThreshold,
  getSmtpConfig,
  getWebhookConfig,
  readConfig,
  isAlertMuted,
} from "./config";
import { writeSnapshot } from "./snapshots";
import { writeAlertLogEntry } from "./alert-log";
import { generateReportHtml } from "./report";
import { writeInfluxDbMetric } from "./influxdb";
import { createServiceNowIncident } from "./servicenow";
import nodemailer from "nodemailer";

const ORG_ID = "757480";
const lastAlerted = new Map<string, Date>();

interface AlertStats {
  online: number;
  offline: number;
  alerting: number;
  dormant: number;
  total: number;
  clientCount: number;
}

async function sendEmailAlert(
  networkName: string,
  networkId: string,
  healthScore: number,
  threshold: number,
  stats: AlertStats
): Promise<void> {
  const smtp = getSmtpConfig();
  if (!smtp.host || !smtp.user || !smtp.pass || !smtp.to) return;

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const subject = `⚠️ SmrtNetwork Alert — ${networkName} health at ${healthScore}%`;
  const html = `
    <h2 style="color:#ef4444">Network Health Alert</h2>
    <p><strong>${networkName}</strong> health score dropped to <strong style="color:#ef4444">${healthScore}%</strong></p>
    <table style="border-collapse:collapse">
      <tr><td style="padding:4px 12px 4px 0">Online</td><td><strong>${stats.online}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0">Offline</td><td><strong style="color:#ef4444">${stats.offline}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0">Alerting</td><td><strong style="color:#f59e0b">${stats.alerting}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0">Total</td><td><strong>${stats.total}</strong></td></tr>
    </table>
    <p style="color:#888;font-size:12px">Sent by SmrtNetwork poller at ${new Date().toLocaleString()}</p>
  `;

  let success = true;
  let error: string | undefined;

  try {
    await transporter.sendMail({ from: smtp.from || smtp.user, to: smtp.to, subject, html });
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : String(err);
    console.error("[Poller] Email alert failed:", error);
  }

  writeAlertLogEntry({ networkId, networkName, healthScore, threshold, channel: "email", success, error });
}

async function sendSlackAlert(
  networkName: string,
  networkId: string,
  healthScore: number,
  threshold: number,
  stats: AlertStats
): Promise<void> {
  const { slack } = getWebhookConfig();
  if (slack.length === 0) return;

  const payload = {
    text: `⚠️ *${networkName}* health dropped to *${healthScore}%*`,
    attachments: [
      {
        color: "danger",
        fields: [
          { title: "Online",   value: String(stats.online),   short: true },
          { title: "Offline",  value: String(stats.offline),  short: true },
          { title: "Alerting", value: String(stats.alerting), short: true },
          { title: "Total",    value: String(stats.total),    short: true },
        ],
      },
    ],
  };

  let success = true;
  let error: string | undefined;

  for (const url of slack) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Slack ${res.status}: ${await res.text().catch(() => "")}`);
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      console.error("[Poller] Slack alert failed:", error);
    }
  }

  writeAlertLogEntry({ networkId, networkName, healthScore, threshold, channel: "slack", success, error });
}

async function sendTeamsAlert(
  networkName: string,
  networkId: string,
  healthScore: number,
  threshold: number,
  stats: AlertStats
): Promise<void> {
  const { teams } = getWebhookConfig();
  if (teams.length === 0) return;

  const payload = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: "FF0000",
    summary: `${networkName} health dropped to ${healthScore}%`,
    title: `⚠️ SmrtNetwork Alert — ${networkName}`,
    text: `**${networkName}** health score dropped to **${healthScore}%**. Online: ${stats.online} | Offline: ${stats.offline} | Alerting: ${stats.alerting} | Total: ${stats.total}`,
  };

  let success = true;
  let error: string | undefined;

  for (const url of teams) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Teams ${res.status}: ${await res.text().catch(() => "")}`);
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      console.error("[Poller] Teams alert failed:", error);
    }
  }

  writeAlertLogEntry({ networkId, networkName, healthScore, threshold, channel: "teams", success, error });
}

async function sendHealthWebhook(
  networkName: string,
  networkId: string,
  healthScore: number,
  threshold: number,
  stats: AlertStats
): Promise<void> {
  const { health } = getWebhookConfig();
  if (health.length === 0) return;

  const payload = {
    event: "health_alert",
    timestamp: new Date().toISOString(),
    network: { id: networkId, name: networkName, healthScore, threshold },
    stats: {
      online: stats.online,
      offline: stats.offline,
      alerting: stats.alerting,
      dormant: stats.dormant,
      total: stats.total,
      clientCount: stats.clientCount,
    },
  };

  let success = true;
  let error: string | undefined;

  for (const url of health) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Webhook ${res.status}: ${await res.text().catch(() => "")}`);
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      console.error("[Poller] Health webhook failed:", error);
    }
  }

  writeAlertLogEntry({ networkId, networkName, healthScore, threshold, channel: "webhook", success, error });
}

async function sendServiceNowAlert(
  networkName: string,
  networkId: string,
  healthScore: number,
  threshold: number,
  stats: AlertStats
): Promise<void> {
  const cfg = readConfig();
  if (!cfg.serviceNowEnabled || !cfg.serviceNowInstanceUrl || !cfg.serviceNowUsername || !cfg.serviceNowPassword) return;

  const shortDescription = `Network health alert: ${networkName} — score ${healthScore}% (threshold: ${threshold}%)`;
  const description = [
    `Network: ${networkName} (${networkId})`,
    `Health Score: ${healthScore}% (threshold: ${threshold}%)`,
    `Online: ${stats.online} | Offline: ${stats.offline} | Alerting: ${stats.alerting} | Total: ${stats.total}`,
    `Clients: ${stats.clientCount}`,
    `Time: ${new Date().toISOString()}`,
    `\nDetected by SmrtNetwork automated poller.`,
  ].join("\n");

  const result = await createServiceNowIncident({
    instanceUrl: cfg.serviceNowInstanceUrl,
    username: cfg.serviceNowUsername,
    password: cfg.serviceNowPassword,
    shortDescription,
    description,
    assignmentGroup: cfg.serviceNowAssignmentGroup,
    category: cfg.serviceNowCategory,
    cmdbCi: cfg.serviceNowCmdbCi,
  });

  if (result.success) {
    console.log(`[Poller] ServiceNow incident created: ${result.incidentNumber ?? result.sysId}`);
  } else {
    console.error("[Poller] ServiceNow incident failed:", result.error);
  }

  writeAlertLogEntry({ networkId, networkName, healthScore, threshold, channel: "servicenow", success: result.success, error: result.error });
}

async function writeInfluxDbHealthMetric(
  networkId: string,
  networkName: string,
  healthScore: number,
  stats: AlertStats
): Promise<void> {
  const cfg = readConfig();
  if (!cfg.influxDbEnabled || !cfg.influxDbUrl) return;

  const result = await writeInfluxDbMetric({
    url: cfg.influxDbUrl,
    mode: cfg.influxDbMode ?? "v2",
    org: cfg.influxDbOrg,
    bucket: cfg.influxDbBucket,
    token: cfg.influxDbToken,
    database: cfg.influxDbDatabase,
    username: cfg.influxDbUsername,
    password: cfg.influxDbPassword,
    networkId,
    networkName,
    healthScore,
    online: stats.online,
    offline: stats.offline,
    alerting: stats.alerting,
    dormant: stats.dormant,
    total: stats.total,
    clientCount: stats.clientCount,
  });

  if (!result.success) {
    console.error("[Poller] InfluxDB write failed:", result.error);
  }
}

async function pollNetworks(): Promise<void> {
  const config = getAlertingConfig();
  const cfg = readConfig();
  const influxEnabled = cfg.influxDbEnabled && !!cfg.influxDbUrl;

  if (!config.enabled && !influxEnabled) return;

  try {
    const [networks, statuses] = await Promise.all([
      meraki.networks.list(ORG_ID),
      meraki.devices.getStatuses(ORG_ID),
    ]);

    for (const network of networks) {
      const devices = statuses.filter((d) => d.networkId === network.id);
      const total = devices.length;
      if (total === 0) continue;

      const online   = devices.filter((d) => d.status === "online").length;
      const offline  = devices.filter((d) => d.status === "offline").length;
      const alerting = devices.filter((d) => d.status === "alerting").length;
      const dormant  = devices.filter((d) => d.status === "dormant").length;
      const healthScore = Math.round((online / total) * 100);

      let clientCount = 0;
      try {
        const clients = await meraki.clients.listByNetwork(network.id, 300);
        clientCount = clients.length;
      } catch {
        clientCount = 0;
      }

      const stats: AlertStats = { online, offline, alerting, dormant, total, clientCount };

      writeSnapshot({
        networkId: network.id,
        networkName: network.name,
        stats: { total, online, offline, alerting, dormant, clientCount, healthScore },
      });

      // Write to InfluxDB on every poll (time series)
      await writeInfluxDbHealthMetric(network.id, network.name, healthScore, stats);

      if (!config.enabled) continue;

      const threshold = getNetworkThreshold(network.id);

      if (healthScore < threshold) {
        const last = lastAlerted.get(network.id);
        const cooldownMs = config.cooldownMinutes * 60 * 1000;
        if (!last || Date.now() - last.getTime() > cooldownMs) {
          if (isAlertMuted()) {
            console.log(`[Poller] Alerts muted — skipping ${network.name}`);
            continue;
          }
          lastAlerted.set(network.id, new Date());
          await sendEmailAlert(network.name, network.id, healthScore, threshold, stats);
          await sendSlackAlert(network.name, network.id, healthScore, threshold, stats);
          await sendTeamsAlert(network.name, network.id, healthScore, threshold, stats);
          await sendHealthWebhook(network.name, network.id, healthScore, threshold, stats);
          await sendServiceNowAlert(network.name, network.id, healthScore, threshold, stats);
        }
      }
    }
  } catch (err) {
    console.error("[Poller] Error:", err instanceof Error ? err.message : err);
  }
}

async function sendScheduledReport(): Promise<void> {
  const smtp = getSmtpConfig();
  if (!smtp.host || !smtp.user || !smtp.pass || !smtp.to) {
    console.log("[Poller] Scheduled report skipped — SMTP not configured");
    return;
  }

  try {
    const [networks, statuses] = await Promise.all([
      meraki.networks.list(ORG_ID),
      meraki.devices.getStatuses(ORG_ID),
    ]);

    const generatedAt = new Date().toISOString();

    for (const network of networks) {
      const devices = statuses.filter((d) => d.networkId === network.id);
      const total   = devices.length;
      const online  = devices.filter((d) => d.status === "online").length;
      const offline = devices.filter((d) => d.status === "offline").length;
      const alerting = devices.filter((d) => d.status === "alerting").length;
      const dormant  = devices.filter((d) => d.status === "dormant").length;

      const reportHtml = generateReportHtml({
        networkId: network.id,
        networkName: network.name,
        generatedAt,
        stats: { total, online, offline, alerting, dormant, clientCount: 0 },
        devices: devices.map((d) => ({
          name: d.name ?? d.serial,
          model: d.model,
          status: d.status ?? "unknown",
          serial: d.serial,
        })),
        topClients: [],
        alerts: [],
      });

      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: { user: smtp.user, pass: smtp.pass },
      });

      await transporter.sendMail({
        from: smtp.from || smtp.user,
        to: smtp.to,
        subject: `SmrtNetwork Report — ${network.name} — ${new Date().toLocaleDateString()}`,
        html: reportHtml,
      }).catch((err: unknown) => {
        console.error("[Poller] Scheduled report email failed:", err instanceof Error ? err.message : err);
      });
    }

    console.log("[Poller] Scheduled report sent");
  } catch (err) {
    console.error("[Poller] Scheduled report error:", err instanceof Error ? err.message : err);
  }
}

function msUntilNext(hour: number, dayOfWeek?: number): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);

  if (dayOfWeek !== undefined) {
    const daysUntil = (dayOfWeek - now.getDay() + 7) % 7 || 7;
    next.setDate(now.getDate() + daysUntil);
  } else if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return Math.max(next.getTime() - now.getTime(), 0);
}

function scheduleDaily(hour: number, fn: () => void): void {
  const delay = msUntilNext(hour);
  setTimeout(function run() {
    fn();
    setTimeout(run, msUntilNext(hour));
  }, delay);
}

function scheduleWeekly(dayOfWeek: number, hour: number, fn: () => void): void {
  const delay = msUntilNext(hour, dayOfWeek);
  setTimeout(function run() {
    fn();
    setTimeout(run, msUntilNext(hour, dayOfWeek));
  }, delay);
}

export function startPoller(): void {
  setInterval(() => pollNetworks().catch(console.error), 5 * 60 * 1000);
  console.log("[Poller] Started — checking networks every 5 minutes");

  const schedule = readConfig().reportSchedule ?? "none";
  if (schedule === "daily") {
    scheduleDaily(7, () => sendScheduledReport().catch(console.error));
    console.log("[Poller] Scheduled report: daily at 7am");
  } else if (schedule === "weekly") {
    scheduleWeekly(1, 7, () => sendScheduledReport().catch(console.error));
    console.log("[Poller] Scheduled report: Monday at 7am");
  }
}
