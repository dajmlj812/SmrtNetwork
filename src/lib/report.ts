export interface ReportData {
  networkId: string;
  networkName: string;
  generatedAt: string;
  stats: {
    total: number;
    online: number;
    offline: number;
    alerting: number;
    dormant: number;
    clientCount: number;
  };
  devices: { name: string; model: string; status: string; serial: string }[];
  topClients: { description?: string; mac: string; usage: { sent: number; recv: number } }[];
  alerts: { name: string; enabled: boolean }[];
}

function statusColor(status: string): string {
  switch (status) {
    case "online":
      return "#4ade80";
    case "offline":
      return "#f87171";
    case "alerting":
      return "#facc15";
    default:
      return "#94a3b8";
  }
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function generateReportHtml(data: ReportData): string {
  const { networkId: _networkId, networkName, generatedAt, stats, devices, topClients, alerts } = data;

  const healthScore =
    stats.total === 0 ? 0 : Math.round((stats.online / stats.total) * 100);

  const healthColor =
    healthScore >= 90 ? "#4ade80" : healthScore >= 70 ? "#facc15" : "#f87171";
  const healthBg =
    healthScore >= 90 ? "#166534" : healthScore >= 70 ? "#854d0e" : "#7f1d1d";

  const deviceRows = devices
    .map(
      (d) => `
    <tr style="border-bottom: 1px solid #333;">
      <td style="padding: 8px 12px; color: #e2e8f0;">${d.name}</td>
      <td style="padding: 8px 12px; color: #94a3b8;">${d.model}</td>
      <td style="padding: 8px 12px; color: #94a3b8; font-family: monospace; font-size: 12px;">${d.serial}</td>
      <td style="padding: 8px 12px; text-align: center;">
        <span style="color: ${statusColor(d.status)}; font-size: 12px; font-weight: 600; text-transform: capitalize;">${d.status}</span>
      </td>
    </tr>`
    )
    .join("");

  const clientRows = topClients
    .map(
      (c) => `
    <tr style="border-bottom: 1px solid #333;">
      <td style="padding: 8px 12px; color: #e2e8f0;">${c.description ?? "Unknown"}</td>
      <td style="padding: 8px 12px; color: #94a3b8; font-family: monospace; font-size: 12px;">${c.mac}</td>
      <td style="padding: 8px 12px; color: #4ade80; text-align: right;">${formatBytes(c.usage.sent)}</td>
      <td style="padding: 8px 12px; color: #60a5fa; text-align: right;">${formatBytes(c.usage.recv)}</td>
    </tr>`
    )
    .join("");

  const alertRows = alerts
    .map(
      (a) => `
    <tr style="border-bottom: 1px solid #333;">
      <td style="padding: 8px 12px; color: #e2e8f0;">${a.name}</td>
      <td style="padding: 8px 12px; text-align: center;">
        <span style="color: ${a.enabled ? "#4ade80" : "#94a3b8"};">${a.enabled ? "Enabled" : "Disabled"}</span>
      </td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SmrtNetwork Report — ${networkName} — ${generatedAt}</title>
</head>
<body style="margin: 0; padding: 0; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 900px; margin: 0 auto; padding: 40px 24px;">

    <!-- Header -->
    <div style="margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #1e293b;">
      <h1 style="margin: 0 0 4px; font-size: 28px; font-weight: 700; color: #f1f5f9;">SmrtNetwork Report</h1>
      <p style="margin: 0 0 4px; font-size: 18px; color: #93c5fd; font-weight: 500;">${networkName}</p>
      <p style="margin: 0; color: #64748b; font-size: 14px;">Generated ${generatedAt}</p>
    </div>

    <!-- Stats Summary -->
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px;">
      <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; text-align: center;">
        <div style="font-size: 32px; font-weight: 700; color: ${healthColor};">${healthScore}%</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em;">Health Score</div>
      </div>
      <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; text-align: center;">
        <div style="font-size: 32px; font-weight: 700; color: #4ade80;">${stats.online}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em;">Online / ${stats.total}</div>
      </div>
      <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; text-align: center;">
        <div style="font-size: 32px; font-weight: 700; color: #f87171;">${stats.offline}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em;">Offline</div>
      </div>
    </div>

    <!-- Health Badge -->
    <div style="margin-bottom: 32px; padding: 12px 20px; background: ${healthBg}; border-radius: 8px; display: inline-block;">
      <span style="color: ${healthColor}; font-weight: 600; font-size: 14px;">
        Health: ${healthScore}% &nbsp;|&nbsp; Online: ${stats.online} &nbsp;|&nbsp; Offline: ${stats.offline} &nbsp;|&nbsp; Alerting: ${stats.alerting} &nbsp;|&nbsp; Dormant: ${stats.dormant} &nbsp;|&nbsp; Clients: ${stats.clientCount}
      </span>
    </div>

    ${devices.length > 0 ? `
    <!-- Device Table -->
    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; margin-bottom: 32px;">
      <div style="padding: 20px 24px; border-bottom: 1px solid #334155;">
        <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #f1f5f9;">Devices (${devices.length})</h2>
      </div>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #334155; background: #0f172a;">
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Name</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Model</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Serial</th>
              <th style="padding: 10px 12px; text-align: center; font-size: 12px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Status</th>
            </tr>
          </thead>
          <tbody>${deviceRows}</tbody>
        </table>
      </div>
    </div>` : ""}

    ${topClients.length > 0 ? `
    <!-- Top Clients -->
    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; margin-bottom: 32px;">
      <div style="padding: 20px 24px; border-bottom: 1px solid #334155;">
        <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #f1f5f9;">Top Clients</h2>
      </div>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #334155; background: #0f172a;">
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Description</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">MAC</th>
              <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Sent</th>
              <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Received</th>
            </tr>
          </thead>
          <tbody>${clientRows}</tbody>
        </table>
      </div>
    </div>` : ""}

    ${alerts.length > 0 ? `
    <!-- Alerts -->
    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; margin-bottom: 32px;">
      <div style="padding: 20px 24px; border-bottom: 1px solid #334155;">
        <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #f1f5f9;">Alert Settings</h2>
      </div>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #334155; background: #0f172a;">
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Alert</th>
              <th style="padding: 10px 12px; text-align: center; font-size: 12px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Status</th>
            </tr>
          </thead>
          <tbody>${alertRows}</tbody>
        </table>
      </div>
    </div>` : ""}

    <!-- Footer -->
    <div style="margin-top: 24px; text-align: center;">
      <p style="color: #475569; font-size: 12px;">SmrtNetwork — Automated Network Health Report</p>
    </div>

  </div>
</body>
</html>`;
}
