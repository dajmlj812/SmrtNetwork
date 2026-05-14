import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import { analyzeWithClaude } from "@/lib/claude/client";
import { HEALTH_ANALYSIS_PROMPT } from "@/lib/claude/prompts";

export async function POST(req: NextRequest) {
  try {
    const { networkId, orgId } = await req.json();
    if (!networkId || !orgId) {
      return NextResponse.json(
        { error: "networkId and orgId are required" },
        { status: 400 }
      );
    }

    const [devices, clients, alertSettings] = await Promise.all([
      meraki.devices.list(networkId),
      meraki.clients.listByNetwork(networkId),
      meraki.alerts.getSettings(networkId),
    ]);

    const summary = JSON.stringify(
      { devices, clientCount: clients.length, alertSettings },
      null,
      2
    );

    const analysis = await analyzeWithClaude(HEALTH_ANALYSIS_PROMPT(summary));
    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
