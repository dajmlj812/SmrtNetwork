import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import { cached } from "@/lib/meraki/cache";

// Client list is the slowest call (5+ s for big networks). Cache briefly so
// repeat visits and per-row sub-fetches don't refetch the whole snapshot.
// Per-MAC lookups are NOT cached — they're tiny and we want fresh.
const CLIENTS_TTL_MS = 30 * 1000;

export async function GET(req: NextRequest) {
  const networkId = req.nextUrl.searchParams.get("networkId");
  const serial = req.nextUrl.searchParams.get("serial");
  const mac = req.nextUrl.searchParams.get("mac");
  const timespan = Number(req.nextUrl.searchParams.get("timespan") ?? 86400);

  try {
    if (networkId && mac) {
      const client = await meraki.clients.getByMac(networkId, mac);
      return NextResponse.json(client);
    }
    if (serial) {
      const clients = await cached(
        `meraki:clients-by-device:${serial}:${timespan}`,
        CLIENTS_TTL_MS,
        () => meraki.clients.listByDevice(serial, timespan)
      );
      return NextResponse.json(clients);
    }
    if (networkId) {
      const clients = await cached(
        `meraki:clients:${networkId}:${timespan}`,
        CLIENTS_TTL_MS,
        () => meraki.clients.listByNetwork(networkId, timespan)
      );
      return NextResponse.json(clients);
    }
    return NextResponse.json(
      { error: "networkId, serial, or mac is required" },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
