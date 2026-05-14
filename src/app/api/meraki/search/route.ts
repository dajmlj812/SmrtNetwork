import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import type { Client, Device } from "@/lib/meraki/types";

/** Normalize any MAC format to colon-separated lowercase */
function normalizeMac(raw: string): string {
  const hex = raw.replace(/[:\-]/g, "").toLowerCase();
  return hex.match(/.{1,2}/g)!.join(":");
}

function detectQueryType(query: string): "mac" | "ip" | "unknown" {
  const trimmed = query.trim();
  // MAC: xx:xx:xx:xx:xx:xx or xx-xx-xx-xx-xx-xx
  if (/^([0-9a-fA-F]{2}[:\-]){5}[0-9a-fA-F]{2}$/.test(trimmed)) return "mac";
  // MAC: 12 hex chars with no separators
  if (/^[0-9a-fA-F]{12}$/.test(trimmed)) return "mac";
  // IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(trimmed)) return "ip";
  return "unknown";
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get("query")?.trim() ?? "";
  const networkId = searchParams.get("networkId") ?? "";
  const orgId = searchParams.get("orgId") ?? "";

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }
  if (!networkId || !orgId) {
    return NextResponse.json(
      { error: "networkId and orgId are required" },
      { status: 400 }
    );
  }

  const type = detectQueryType(query);

  if (type === "unknown") {
    return NextResponse.json(
      { error: "Query must be a MAC address or IPv4 address" },
      { status: 400 }
    );
  }

  let client: Client | null = null;
  let device: Device | null = null;

  try {
    if (type === "mac") {
      const normalizedMac = normalizeMac(query);

      // Fetch client and device statuses in parallel
      const [clientResult, deviceStatuses] = await Promise.allSettled([
        meraki.clients.getByMac(networkId, normalizedMac),
        meraki.devices.getStatuses(orgId),
      ]);

      if (clientResult.status === "fulfilled") {
        client = clientResult.value;
      }

      if (deviceStatuses.status === "fulfilled") {
        device =
          deviceStatuses.value.find(
            (d) => d.mac.toLowerCase() === normalizedMac.toLowerCase()
          ) ?? null;
      }
    } else {
      // IP lookup: fetch all clients and device statuses in parallel
      const [clients, deviceStatuses] = await Promise.allSettled([
        meraki.clients.listByNetwork(networkId, 86400),
        meraki.devices.getStatuses(orgId),
      ]);

      if (clients.status === "fulfilled") {
        client = clients.value.find((c) => c.ip === query) ?? null;
      }

      if (deviceStatuses.status === "fulfilled") {
        device =
          deviceStatuses.value.find(
            (d) =>
              d.lanIp === query || d.wan1Ip === query || d.wan2Ip === query
          ) ?? null;
      }
    }

    return NextResponse.json({ type, client, device });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
