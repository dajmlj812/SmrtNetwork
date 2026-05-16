import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import { cached } from "@/lib/meraki/cache";

// Devices change rarely (hardware inventory). Statuses change more often but
// are still safe to cache briefly. The dashboard refetches on a 60s interval
// regardless, so this just dedupes within-window traffic.
const DEVICES_TTL_MS = 60 * 1000;
const STATUSES_TTL_MS = 30 * 1000;

export async function GET(req: NextRequest) {
  const networkId = req.nextUrl.searchParams.get("networkId");
  const orgId = req.nextUrl.searchParams.get("orgId");

  try {
    if (orgId) {
      const statuses = await cached(
        `meraki:device-statuses:${orgId}`,
        STATUSES_TTL_MS,
        () => meraki.devices.getStatuses(orgId)
      );
      return NextResponse.json(statuses);
    }
    if (networkId) {
      const devices = await cached(
        `meraki:devices:${networkId}`,
        DEVICES_TTL_MS,
        () => meraki.devices.list(networkId)
      );
      return NextResponse.json(devices);
    }
    return NextResponse.json(
      { error: "networkId or orgId is required" },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
