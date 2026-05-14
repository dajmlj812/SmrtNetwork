import { schedule as cronSchedule } from "node-cron";
import { meraki } from "./meraki/client";
import { getAlertingConfig, getSmtpConfig } from "./config";
import { writeSnapshot } from "./snapshots";
import nodemailer from "nodemailer";

const ORG_ID = "757480";
const lastAlerted = new Map<string, Date>();

async function sendAlert(
  networkName: string,
  healthScore: number,
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

  await transporter
    .sendMail({ from: smtp.from || smtp.user, to: smtp.to, subject, html })
    .catch(console.error);
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
          await sendAlert(network.name, healthScore, { online, offline, alerting, total });
        }
      }
    }
  } catch (err) {
    console.error("[Poller] Error:", err instanceof Error ? err.message : err);
  }
}

export function startPoller(): void {
  // Run every 5 minutes
  cronSchedule("*/5 * * * *", () => {
    pollNetworks().catch(console.error);
  });
  console.log("[Poller] Started — checking networks every 5 minutes");
}
