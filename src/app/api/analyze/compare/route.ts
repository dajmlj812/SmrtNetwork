import { NextRequest, NextResponse } from "next/server";
import { analyzeWithClaude } from "@/lib/claude/client";

interface NetworkStats {
  total: number;
  online: number;
  offline: number;
  alerting: number;
  dormant: number;
  clientCount: number;
}

interface NetworkInfo {
  id: string;
  name: string;
  stats: NetworkStats;
}

interface CompareRequestBody {
  networkA: NetworkInfo;
  networkB: NetworkInfo;
}

function buildComparePrompt(a: NetworkInfo, b: NetworkInfo): string {
  const healthA = a.stats.total > 0
    ? Math.round((a.stats.online / a.stats.total) * 100)
    : 0;
  const healthB = b.stats.total > 0
    ? Math.round((b.stats.online / b.stats.total) * 100)
    : 0;

  return `Compare these two Meraki networks and provide:
1. Which network is healthier overall, and why
2. Key differences in device status and client counts
3. Any concerns or risk factors for each network
4. Specific recommendations for each network

Network A: ${a.name}
- Health Score: ${healthA}%
- Total Devices: ${a.stats.total}
- Online: ${a.stats.online}
- Offline: ${a.stats.offline}
- Alerting: ${a.stats.alerting}
- Dormant: ${a.stats.dormant}
- Connected Clients: ${a.stats.clientCount}

Network B: ${b.name}
- Health Score: ${healthB}%
- Total Devices: ${b.stats.total}
- Online: ${b.stats.online}
- Offline: ${b.stats.offline}
- Alerting: ${b.stats.alerting}
- Dormant: ${b.stats.dormant}
- Connected Clients: ${b.stats.clientCount}

Be concise and specific. Use markdown for structure.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CompareRequestBody;

    if (!body.networkA || !body.networkB) {
      return NextResponse.json(
        { error: "networkA and networkB are required" },
        { status: 400 }
      );
    }

    const prompt = buildComparePrompt(body.networkA, body.networkB);
    const analysis = await analyzeWithClaude(prompt);
    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
