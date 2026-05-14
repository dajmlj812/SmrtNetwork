import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import { writeSnapshot } from "@/lib/snapshots";

export async function GET(req: NextRequest) {
  const networkId = req.nextUrl.searchParams.get("networkId");
  const orgId = req.nextUrl.searchParams.get("orgId");
  const networkName = req.nextUrl.searchParams.get("networkName");

  if (!networkId || !orgId) {
    return NextResponse.json(
      { error: "networkId and orgId are required" },
      { status: 400 }
    );
  }

  try {
    const [devices, statuses, clients] = await Promise.all([
      meraki.devices.list(networkId),
      meraki.devices.getStatuses(orgId),
      meraki.clients.listByNetwork(networkId, 3600),
    ]);

    // Filter statuses to only devices belonging to this network
    const networkSerials = new Set(devices.map((d) => d.serial));
    const networkStatuses = statuses.filter((s) => networkSerials.has(s.serial));

    const total = networkStatuses.length || devices.length;
    const online = networkStatuses.filter((s) => s.status === "online").length;
    const offline = networkStatuses.filter((s) => s.status === "offline").length;
    const alerting = networkStatuses.filter((s) => s.status === "alerting").length;
    const dormant = networkStatuses.filter((s) => s.status === "dormant").length;
    const clientCount = clients.length;

    const healthScore = total > 0 ? Math.round((online / total) * 100) : 0;

    // Auto-save snapshot every time stats are fetched
    try {
      writeSnapshot({
        networkId,
        networkName: networkName ?? networkId,
        stats: { total, online, offline, alerting, dormant, clientCount, healthScore },
      });
    } catch {
      // Non-fatal: snapshot write failure should not block the stats response
    }

    return NextResponse.json({
      total,
      online,
      offline,
      alerting,
      dormant,
      clientCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
