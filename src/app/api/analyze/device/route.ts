import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import { analyzeWithClaude } from "@/lib/claude/client";
import { DEVICE_DIAGNOSIS_PROMPT } from "@/lib/claude/prompts";

export async function POST(req: NextRequest) {
  try {
    const { serial, networkId } = await req.json();
    if (!serial) {
      return NextResponse.json({ error: "serial is required" }, { status: 400 });
    }

    const now = new Date();
    const t0 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const [clients, lossLatency] = await Promise.all([
      meraki.clients.listByDevice(serial),
      meraki.devices.lossAndLatency(serial, {
        t0,
        t1: now.toISOString(),
        resolution: "300",
        uplink: "wan1",
      }),
    ]);

    const deviceData = JSON.stringify({ serial, networkId, clients, lossLatency }, null, 2);
    const analysis = await analyzeWithClaude(DEVICE_DIAGNOSIS_PROMPT(deviceData));
    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
