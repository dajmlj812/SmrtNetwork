import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import { analyzeWithClaude } from "@/lib/claude/client";

function CLIENT_ANALYSIS_PROMPT(clientData: string): string {
  return `Analyze the following Meraki network client and provide:
1. Device type identification (what kind of device is this likely to be based on manufacturer, OS, MAC OUI, and behavior)
2. Usage pattern assessment — is the upload/download ratio and total usage normal for this device type?
3. Network behavior — SSID, VLAN placement, AP associations, and whether they appear appropriate
4. Any potential concerns — security risks, anomalous traffic, unusual activity patterns
5. Summary: normal vs. anomalous behavior verdict with reasoning

Client data:
${clientData}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { mac?: string; networkId?: string; clientId?: string };
    const { mac, networkId, clientId } = body;

    if (!mac || !networkId || !clientId) {
      return NextResponse.json(
        { error: "mac, networkId, and clientId are required" },
        { status: 400 }
      );
    }

    // Fetch client details from Meraki using the clientId (which can be MAC)
    const clientDetails = await meraki.clients.getByMac(networkId, clientId);

    const clientData = JSON.stringify({ mac, networkId, clientId, details: clientDetails }, null, 2);
    const analysis = await analyzeWithClaude(CLIENT_ANALYSIS_PROMPT(clientData));

    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
