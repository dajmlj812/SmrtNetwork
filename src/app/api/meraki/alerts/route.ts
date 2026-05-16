import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import { cached } from "@/lib/meraki/cache";

// Alert profiles change rarely — 2 min TTL is generous.
const TTL_MS = 2 * 60 * 1000;

export async function GET(req: NextRequest) {
  const networkId = req.nextUrl.searchParams.get("networkId");
  if (!networkId) {
    return NextResponse.json({ error: "networkId is required" }, { status: 400 });
  }
  try {
    const settings = await cached(
      `meraki:alerts:${networkId}`,
      TTL_MS,
      () => meraki.alerts.getSettings(networkId)
    );
    return NextResponse.json(settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
