import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const networkId = searchParams.get("networkId") ?? "";
  const perPage = Math.min(Number(searchParams.get("perPage") ?? "25"), 100);

  if (!networkId) {
    return NextResponse.json({ error: "networkId is required" }, { status: 400 });
  }

  try {
    const events = await meraki.events.list(networkId, perPage);
    return NextResponse.json(events);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    // Meraki returns 400/404 for network types that don't support events — treat as empty
    if (message.includes("400") || message.includes("404") || message.includes("not supported")) {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
