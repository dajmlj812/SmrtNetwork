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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
