import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import type { Device, Network } from "@/lib/meraki/types";

export interface NetworkOverviewItem {
  networkId: string;
  networkName: string;
  productTypes: string[];
  tags: string[];
  total: number;
  online: number;
  offline: number;
  alerting: number;
  dormant: number;
  healthScore: number;
}

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  try {
    const [networks, statuses] = await Promise.all([
      meraki.networks.list(orgId),
      meraki.devices.getStatuses(orgId),
    ]);

    // Group device statuses by networkId
    const byNetwork = new Map<string, Device[]>();
    for (const device of statuses) {
      const arr = byNetwork.get(device.networkId) ?? [];
      arr.push(device);
      byNetwork.set(device.networkId, arr);
    }

    const items: NetworkOverviewItem[] = networks.map((net: Network) => {
      const devices = byNetwork.get(net.id) ?? [];
      const total = devices.length;
      const online = devices.filter((d) => d.status === "online").length;
      const offline = devices.filter((d) => d.status === "offline").length;
      const alerting = devices.filter((d) => d.status === "alerting").length;
      const dormant = devices.filter((d) => d.status === "dormant").length;
      const healthScore = total === 0 ? 0 : Math.round((online / total) * 100);

      return {
        networkId: net.id,
        networkName: net.name,
        productTypes: net.productTypes,
        tags: net.tags,
        total,
        online,
        offline,
        alerting,
        dormant,
        healthScore,
      };
    });

    // Sort: most alerting/offline first, then by name
    items.sort((a, b) => {
      const aBad = a.alerting + a.offline;
      const bBad = b.alerting + b.offline;
      if (bBad !== aBad) return bBad - aBad;
      return a.networkName.localeCompare(b.networkName);
    });

    return NextResponse.json(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
