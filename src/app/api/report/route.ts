import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import { analyzeWithClaude } from "@/lib/claude/client";
import { getSmtpConfig } from "@/lib/config";
import { generateReportHtml } from "@/lib/report";
import { saveReport } from "@/lib/report-history";
import type { Device, Network } from "@/lib/meraki/types";

interface NetworkSummary {
  networkId: string;
  networkName: string;
  productTypes: string[];
  total: number;
  online: number;
  offline: number;
  alerting: number;
  dormant: number;
  healthScore: number;
}

function buildOrgHtmlReport(
  summaries: NetworkSummary[],
  narrative: string,
  generatedAt: string
): string {
  const rows = summaries
    .map(
      (s) => `
    <tr style="border-bottom: 1px solid #333;">
      <td style="padding: 10px 12px; color: #e2e8f0;">${s.networkName}</td>
      <td style="padding: 10px 12px; color: #94a3b8;">${s.productTypes.join(", ")}</td>
      <td style="padding: 10px 12px; color: #e2e8f0; text-align: center;">${s.total}</td>
      <td style="padding: 10px 12px; color: #4ade80; text-align: center;">${s.online}</td>
      <td style="padding: 10px 12px; color: #f87171; text-align: center;">${s.offline}</td>
      <td style="padding: 10px 12px; color: #facc15; text-align: center;">${s.alerting}</td>
      <td style="padding: 10px 12px; text-align: center;">
        <span style="
          display: inline-block; padding: 2px 8px; border-radius: 9999px;
          font-size: 12px; font-weight: 600;
          background: ${s.healthScore >= 90 ? "#166534" : s.healthScore >= 70 ? "#854d0e" : "#7f1d1d"};
          color: ${s.healthScore >= 90 ? "#4ade80" : s.healthScore >= 70 ? "#facc15" : "#f87171"};
        ">${s.healthScore}%</span>
      </td>
    </tr>`
    )
    .join("");

  const narrativeHtml = narrative
    .split("\n")
    .map((line) => `<p style="margin: 0 0 8px; color: #cbd5e1; line-height: 1.6;">${line}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>SmrtNetwork Org Report — ${generatedAt}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:900px;margin:0 auto;padding:40px 24px;">
    <div style="margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #1e293b;">
      <h1 style="margin:0 0 4px;font-size:28px;font-weight:700;color:#f1f5f9;">SmrtNetwork Org Report</h1>
      <p style="margin:0;color:#64748b;font-size:14px;">Generated ${generatedAt}</p>
    </div>
    <div style="margin-bottom:32px;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;">
      <h2 style="margin:0 0 16px;font-size:16px;font-weight:600;color:#93c5fd;text-transform:uppercase;letter-spacing:.05em;">AI Health Narrative</h2>
      ${narrativeHtml}
    </div>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #334155;">
        <h2 style="margin:0;font-size:16px;font-weight:600;color:#f1f5f9;">Network Summary</h2>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid #334155;background:#0f172a;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:500;text-transform:uppercase;letter-spacing:.05em;">Network</th>
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:500;text-transform:uppercase;letter-spacing:.05em;">Types</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:500;text-transform:uppercase;letter-spacing:.05em;">Total</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:500;text-transform:uppercase;letter-spacing:.05em;">Online</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:500;text-transform:uppercase;letter-spacing:.05em;">Offline</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:500;text-transform:uppercase;letter-spacing:.05em;">Alerting</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:500;text-transform:uppercase;letter-spacing:.05em;">Health</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
    <div style="margin-top:24px;text-align:center;">
      <p style="color:#475569;font-size:12px;">SmrtNetwork — Automated Network Health Report</p>
    </div>
  </div>
</body>
</html>`;
}

async function handleNetworkReport(networkId: string, networkName: string): Promise<string> {
  const [devices, clients] = await Promise.all([
    meraki.devices.list(networkId),
    meraki.clients.listByNetwork(networkId, 86400).catch(() => []),
  ]);

  const total    = devices.length;
  const online   = devices.filter((d) => d.status === "online").length;
  const offline  = devices.filter((d) => d.status === "offline").length;
  const alerting = devices.filter((d) => d.status === "alerting").length;
  const dormant  = devices.filter((d) => d.status === "dormant").length;

  // Sort devices: alerting first, then offline, then online
  const sorted = [...devices].sort((a, b) => {
    const rank = { alerting: 0, offline: 1, dormant: 2, online: 3 };
    return (rank[a.status ?? "dormant"] ?? 3) - (rank[b.status ?? "dormant"] ?? 3);
  });

  const topClients = [...clients]
    .sort((a, b) => (b.usage.sent + b.usage.recv) - (a.usage.sent + a.usage.recv))
    .slice(0, 10)
    .map((c) => ({ description: c.description, mac: c.mac, usage: c.usage }));

  return generateReportHtml({
    networkId,
    networkName,
    generatedAt: new Date().toLocaleString(),
    stats: { total, online, offline, alerting, dormant, clientCount: clients.length },
    devices: sorted.map((d) => ({
      name: d.name || d.serial,
      model: d.model,
      status: d.status ?? "unknown",
      serial: d.serial,
    })),
    topClients,
    alerts: [],
  });
}

async function handleOrgReport(orgId: string): Promise<{ html: string; emailSent: boolean; sendEmail: boolean }> {
  const [networks, statuses] = await Promise.all([
    meraki.networks.list(orgId),
    meraki.devices.getStatuses(orgId),
  ]);

  const byNetwork = new Map<string, Device[]>();
  for (const device of statuses) {
    const arr = byNetwork.get(device.networkId) ?? [];
    arr.push(device);
    byNetwork.set(device.networkId, arr);
  }

  const summaries: NetworkSummary[] = networks.map((net: Network) => {
    const devices = byNetwork.get(net.id) ?? [];
    const total   = devices.length;
    const online  = devices.filter((d) => d.status === "online").length;
    const offline = devices.filter((d) => d.status === "offline").length;
    const alerting = devices.filter((d) => d.status === "alerting").length;
    const dormant  = devices.filter((d) => d.status === "dormant").length;
    return {
      networkId: net.id,
      networkName: net.name,
      productTypes: net.productTypes,
      total, online, offline, alerting, dormant,
      healthScore: total === 0 ? 0 : Math.round((online / total) * 100),
    };
  });

  summaries.sort((a, b) => (b.alerting + b.offline) - (a.alerting + a.offline));

  const totalDevices  = summaries.reduce((s, n) => s + n.total, 0);
  const totalOnline   = summaries.reduce((s, n) => s + n.online, 0);
  const totalOffline  = summaries.reduce((s, n) => s + n.offline, 0);
  const totalAlerting = summaries.reduce((s, n) => s + n.alerting, 0);
  const avgHealth = summaries.length
    ? Math.round(summaries.reduce((s, n) => s + n.healthScore, 0) / summaries.length)
    : 0;

  const prompt = `You are a network operations analyst. Generate a concise health narrative for this Meraki organization report.

Organization: ${networks.length} networks, ${totalDevices} devices — ${totalOnline} online, ${totalOffline} offline, ${totalAlerting} alerting. Average health: ${avgHealth}%.

Per-network:
${summaries.map((s) => `  - ${s.networkName}: ${s.total} devices, ${s.online} online, ${s.offline} offline, ${s.alerting} alerting, health ${s.healthScore}%`).join("\n")}

Write a professional 2-4 paragraph summary: overall health, networks needing attention, brief recommendations. Be factual and concise.`;

  let narrative = "";
  try {
    narrative = await analyzeWithClaude(prompt);
  } catch {
    narrative = `${totalOnline}/${totalDevices} devices online across ${networks.length} networks. Average health score: ${avgHealth}%.`;
  }

  return {
    html: buildOrgHtmlReport(summaries, narrative, new Date().toLocaleString()),
    emailSent: false,
    sendEmail: false,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      orgId?: string;
      networkId?: string;
      networkName?: string;
      sendEmail?: boolean;
    };

    const { orgId, networkId, networkName, sendEmail } = body;

    let reportHtml: string;
    let scope: "org" | string;
    let title: string;

    if (networkId && networkName) {
      // Per-network report
      reportHtml = await handleNetworkReport(networkId, networkName);
      scope = networkId;
      title = `${networkName} — ${new Date().toLocaleDateString()}`;
    } else if (orgId) {
      // Org-wide report
      const result = await handleOrgReport(orgId);
      reportHtml = result.html;
      scope = "org";
      title = `Org-Wide — ${new Date().toLocaleDateString()}`;
    } else {
      return NextResponse.json({ error: "orgId or (networkId + networkName) is required" }, { status: 400 });
    }

    // Save to history
    saveReport({ title, scope, html: reportHtml });

    let emailSent = false;
    if (sendEmail && scope === "org") {
      const smtp = getSmtpConfig();
      if (smtp.host && smtp.user && smtp.pass) {
        try {
          const nodemailer = await import("nodemailer");
          const transporter = nodemailer.default.createTransport({
            host: smtp.host,
            port: smtp.port,
            auth: { user: smtp.user, pass: smtp.pass },
          });
          await transporter.sendMail({
            from: smtp.from || smtp.user,
            to: smtp.to,
            subject: `SmrtNetwork Report — ${new Date().toLocaleDateString()}`,
            html: reportHtml,
          });
          emailSent = true;
        } catch {
          emailSent = false;
        }
      }
    }

    return NextResponse.json({ html: reportHtml, emailSent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
