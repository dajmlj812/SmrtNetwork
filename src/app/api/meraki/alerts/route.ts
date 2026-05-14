import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";

export async function GET(req: NextRequest) {
  const networkId = req.nextUrl.searchParams.get("networkId");
  if (!networkId) {
    return NextResponse.json({ error: "networkId is required" }, { status: 400 });
  }
  try {
    const settings = await meraki.alerts.getSettings(networkId);
    return NextResponse.json(settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
