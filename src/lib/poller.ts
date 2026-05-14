import { schedule as cronSchedule } from "node-cron";
import { meraki } from "./meraki/client";
import { getAlertingConfig, getSmtpConfig, getWebhookConfig, readConfig } from "./config";
import { writeSnapshot } from "./snapshots";
import { writeAlertLogEntry } from "./alert-log";
import { generateReportHtml } from "./report";
import nodemailer from "nodemailer";

const ORG_ID = "757480";
const lastAlerted = new Map<string, Date>();

async function sendEmailAlert(
  networkName: string,
  networkId: string,
  healthScore: number,
  threshold: number,
  stats: { online: number; offline: number; alerting: number; total: number }
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

  writeAlertLogEntry({
    networkId,
    networkName,
    healthScore,
    threshold,
    channel: "email",
    success,
    error,
  });
}

async function sendSlackAlert(
  networkName: string,
  networkId: string,
  healthScore: number,
  threshold: number,
  stats: { online: number; offline: number; alerting: number; total: number }
): Promise<boolean> {
  const { slack } = getWebhookConfig();
  if (!slack) return false;

  const payload = {
    text: `⚠️ *${networkName}* health dropped to *${healthScore}%*`,
    attachments: [
      {
        color: "danger",
        fields: [
          { title: "Online", value: String(stats.online), short: true },
          { title: "Offline", value: String(stats.offline), short: true },
          { title: "Alerting", value: String(stats.alerting), short: true },
          { title: "Total", value: String(stats.total), short: true },
        ],
      },
    ],
  };

  let success = true;
  let error: string | undefined;

  try {
    const res = await fetch(slack, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Slack responded ${res.status}: ${text}`);
    }
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : String(err);
    console.error("[Poller] Slack alert failed:", error);
  }

  writeAlertLogEntry({
    networkId,
    networkName,
    healthScore,
    threshold,
    channel: "slack",
    success,
    error,
  });

  return success;
}

async function sendTeamsAlert(
  networkName: string,
  networkId: string,
  healthScore: number,
  threshold: number,
  stats: { online: number; offline: number; alerting: number; total: number }
): Promise<boolean> {
  const { teams } = getWebhookConfig();
  if (!teams) return false;

  const summary = `${networkName} health dropped to ${healthScore}%`;
  const payload = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: "FF0000",
    summary,
    title: `⚠️ SmrtNetwork Alert — ${networkName}`,
    text: `**${networkName}** health score dropped to **${healthScore}%**. Online: ${stats.online} | Offline: ${stats.offline} | Alerting: ${stats.alerting} | Total: ${stats.total}`,
  };

  let success = true;
  let error: string | undefined;

  try {
    const res = await fetch(teams, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Teams responded ${res.status}: ${text}`);
    }
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : String(err);
    console.error("[Poller] Teams alert failed:", error);
  }

  writeAlertLogEntry({
    networkId,
    networkName,
    healthScore,
    threshold,
    channel: "teams",
    success,
    error,
  });

  return success;
}

async function pollNetworks(): Promise<void> {
  const config = getAlertingConfig();
  if (!config.enabled) return;

  try {
    const [networks, statuses] = await Promise.all([
      meraki.networks.list(ORG_ID),
      meraki.devices.getStatuses(ORG_ID),
    ]);

    for (const network of networks) {
      const devices = statuses.filter((d) => d.networkId === network.id);
      const total = devices.length;
      if (total === 0) continue;

      const online = devices.filter((d) => d.status === "online").length;
      const offline = devices.filter((d) => d.status === "offline").length;
      const alerting = devices.filter((d) => d.status === "alerting").length;
      const dormant = devices.filter((d) => d.status === "dormant").length;
      const healthScore = Math.round((online / total) * 100);

      // Save snapshot
      writeSnapshot({
        networkId: network.id,
        networkName: network.name,
        stats: {
          total,
          online,
          offline,
          alerting,
          dormant,
          clientCount: 0,
          healthScore,
        },
      });

      // Check threshold
      if (healthScore < config.threshold) {
        const last = lastAlerted.get(network.id);
        const cooldownMs = config.cooldownMinutes * 60 * 1000;
        if (!last || Date.now() - last.getTime() > cooldownMs) {
          lastAlerted.set(network.id, new Date());
          const stats = { online, offline, alerting, total };

          await sendEmailAlert(network.name, network.id, healthScore, config.threshold, stats);
          await sendSlackAlert(network.name, network.id, healthScore, config.threshold, stats);
          await sendTeamsAlert(network.name, network.id, healthScore, config.threshold, stats);
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
      const total = devices.length;
      const online = devices.filter((d) => d.status === "online").length;
      const offline = devices.filter((d) => d.status === "offline").length;
      const alerting = devices.filter((d) => d.status === "alerting").length;
      const dormant = devices.filter((d) => d.status === "dormant").length;
      const clientCount = 0;

      const deviceRows = devices.map((d) => ({
        name: d.name ?? d.serial,
        model: d.model,
        status: d.status ?? "unknown",
        serial: d.serial,
      }));

      const reportHtml = generateReportHtml({
        networkId: network.id,
        networkName: network.name,
        generatedAt,
        stats: { total, online, offline, alerting, dormant, clientCount },
        devices: deviceRows,
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

export function startPoller(): void {
  // Run every 5 minutes
  cronSchedule("*/5 * * * *", () => {
    pollNetworks().catch(console.error);
  });
  console.log("[Poller] Started — checking networks every 5 minutes");

  // Schedule reports based on config
  const schedule = readConfig().reportSchedule ?? "none";

  if (schedule === "daily") {
    cronSchedule("0 7 * * *", () => {
      sendScheduledReport().catch(console.error);
    });
    console.log("[Poller] Scheduled report: daily at 7am");
  } else if (schedule === "weekly") {
    cronSchedule("0 7 * * 1", () => {
      sendScheduledReport().catch(console.error);
    });
    console.log("[Poller] Scheduled report: Monday at 7am");
  }
}
