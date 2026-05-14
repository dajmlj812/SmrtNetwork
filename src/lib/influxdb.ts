function escapeTag(value: string): string {
  return value.replace(/[, =\\]/g, "\\$&");
}

function buildLineProtocol(opts: {
  networkId: string;
  networkName: string;
  healthScore: number;
  online: number;
  offline: number;
  alerting: number;
  dormant: number;
  total: number;
  clientCount: number;
}): string {
  const { networkId, networkName, healthScore, online, offline, alerting, dormant, total, clientCount } = opts;
  const tags = `network_id=${escapeTag(networkId)},network_name=${escapeTag(networkName)}`;
  const fields = [
    `healthScore=${healthScore.toFixed(2)}`,
    `online=${online}i`,
    `offline=${offline}i`,
    `alerting=${alerting}i`,
    `dormant=${dormant}i`,
    `total=${total}i`,
    `clientCount=${clientCount}i`,
  ].join(",");
  const ts = Math.floor(Date.now() / 1000);
  return `network_health,${tags} ${fields} ${ts}`;
}

export async function writeInfluxDbMetric(opts: {
  url: string;
  mode: "v1" | "v2";
  org?: string;
  bucket?: string;
  token?: string;
  database?: string;
  username?: string;
  password?: string;
  networkId: string;
  networkName: string;
  healthScore: number;
  online: number;
  offline: number;
  alerting: number;
  dormant: number;
  total: number;
  clientCount: number;
}): Promise<{ success: boolean; error?: string }> {
  const { url, mode, org, bucket, token, database, username, password } = opts;
  const base = url.replace(/\/$/, "");
  const line = buildLineProtocol(opts);

  let writeUrl: string;
  const headers: Record<string, string> = { "Content-Type": "text/plain; charset=utf-8" };

  if (mode === "v2") {
    writeUrl = `${base}/api/v2/write?org=${encodeURIComponent(org ?? "")}&bucket=${encodeURIComponent(bucket ?? "")}&precision=s`;
    if (token) headers["Authorization"] = `Token ${token}`;
  } else {
    writeUrl = `${base}/write?db=${encodeURIComponent(database ?? "")}&precision=s`;
    if (username && password) {
      headers["Authorization"] = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
    }
  }

  try {
    const res = await fetch(writeUrl, { method: "POST", headers, body: line });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { success: false, error: `InfluxDB ${res.status}: ${text.slice(0, 200)}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function testInfluxDbConnection(opts: {
  url: string;
  mode: "v1" | "v2";
  token?: string;
  username?: string;
  password?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { url, mode, token, username, password } = opts;
  const base = url.replace(/\/$/, "");

  try {
    let healthUrl: string;
    const headers: Record<string, string> = {};

    if (mode === "v2") {
      healthUrl = `${base}/health`;
      if (token) headers["Authorization"] = `Token ${token}`;
    } else {
      healthUrl = `${base}/ping`;
      if (username && password) {
        headers["Authorization"] = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
      }
    }

    const res = await fetch(healthUrl, { method: "GET", headers });
    if (!res.ok && res.status !== 204) return { success: false, error: `HTTP ${res.status}` };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
