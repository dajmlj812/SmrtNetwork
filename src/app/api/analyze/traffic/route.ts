import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import { analyzeWithClaude } from "@/lib/claude/client";
import { TRAFFIC_ANALYSIS_PROMPT } from "@/lib/claude/prompts";
import { formatBytes } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { networkId } = await req.json();
    if (!networkId) {
      return NextResponse.json({ error: "networkId is required" }, { status: 400 });
    }

    const clients = await meraki.clients.listByNetwork(networkId, 3600);

    const topTalkers = clients
      .sort((a, b) => b.usage.sent + b.usage.recv - (a.usage.sent + a.usage.recv))
      .slice(0, 20)
      .map((c) => ({
        mac: c.mac,
        description: c.description,
        ip: c.ip,
        manufacturer: c.manufacturer,
        totalUsage: formatBytes(c.usage.sent + c.usage.recv),
        sent: formatBytes(c.usage.sent),
        recv: formatBytes(c.usage.recv),
      }));

    const trafficData = JSON.stringify({ networkId, topTalkers, totalClients: clients.length }, null, 2);
    const analysis = await analyzeWithClaude(TRAFFIC_ANALYSIS_PROMPT(trafficData));
    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
