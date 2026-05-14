import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import type { Ssid, ChannelUtilization, WirelessConnectionStats } from "@/lib/meraki/types";

export type WirelessResponse =
  | { supported: false }
  | {
      supported: true;
      ssids: Ssid[];
      channelUtilization: ChannelUtilization[];
      connectionStats: WirelessConnectionStats | null;
    };

export async function GET(req: NextRequest) {
  const networkId = req.nextUrl.searchParams.get("networkId");
  if (!networkId) {
    return NextResponse.json({ error: "networkId is required" }, { status: 400 });
  }

  try {
    const now = new Date();
    const t1 = now.toISOString();
    const t0 = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    // SSID fetch is the canary — a 400/404 means no wireless on this network
    let ssids: Ssid[] = [];
    try {
      const allSsids = await meraki.wireless.ssids(networkId);
      ssids = allSsids.filter((s) => s.enabled);
    } catch {
      // Any error here means wireless is not supported or not reachable
      return NextResponse.json({ supported: false } satisfies WirelessResponse);
    }

    const [channelUtilization, connectionStats] = await Promise.all([
      meraki.wireless
        .channelUtilization(networkId, { t0, t1, resolution: "600" })
        .catch((): ChannelUtilization[] => []),
      meraki.wireless
        .connectionStats(networkId, { t0, t1 })
        .catch((): null => null),
    ]);

    return NextResponse.json({
      supported: true,
      ssids,
      channelUtilization,
      connectionStats,
    } satisfies WirelessResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
