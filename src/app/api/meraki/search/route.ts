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

export type SearchResultItem =
  | { type: "device"; data: Device }
  | { type: "client"; data: Client };

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const networkId = searchParams.get("networkId") ?? "";

  // --- Name-based global search (used by GlobalSearch UI) ---
  const q = searchParams.get("q")?.trim() ?? "";
  if (q) {
    if (!networkId) {
      return NextResponse.json(
        { error: "networkId is required for name search" },
        { status: 400 }
      );
    }

    const lower = q.toLowerCase();

    const [devicesResult, clientsResult] = await Promise.allSettled([
      meraki.devices.list(networkId),
      meraki.clients.listByNetwork(networkId, 86400),
    ]);

    const results: SearchResultItem[] = [];

    if (devicesResult.status === "fulfilled") {
      devicesResult.value
        .filter(
          (d) =>
            d.name?.toLowerCase().includes(lower) ||
            d.model.toLowerCase().includes(lower) ||
            d.mac.toLowerCase().includes(lower) ||
            d.serial.toLowerCase().includes(lower) ||
            d.lanIp?.toLowerCase().includes(lower)
        )
        .slice(0, 10)
        .forEach((d) => results.push({ type: "device", data: d }));
    }

    if (clientsResult.status === "fulfilled") {
      clientsResult.value
        .filter(
          (c) =>
            c.description?.toLowerCase().includes(lower) ||
            c.mac.toLowerCase().includes(lower) ||
            c.ip?.toLowerCase().includes(lower) ||
            c.manufacturer?.toLowerCase().includes(lower)
        )
        .slice(0, 10)
        .forEach((c) => results.push({ type: "client", data: c }));
    }

    return NextResponse.json(results);
  }

  // --- MAC / IP lookup (legacy, used by /devices page) ---
  const query = searchParams.get("query")?.trim() ?? "";
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
