import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const networkId = searchParams.get("networkId");
  const timespan = Number(searchParams.get("timespan") ?? 3600);

  if (!networkId) {
    return NextResponse.json({ error: "networkId is required" }, { status: 400 });
  }

  try {
    const clients = await meraki.clients.listByNetwork(networkId, timespan);

    const topClients = clients
      .map((c) => ({
        mac: c.mac,
        description: c.description ?? null,
        ip: c.ip ?? null,
        manufacturer: c.manufacturer ?? null,
        sent: c.usage.sent,
        recv: c.usage.recv,
        total: c.usage.sent + c.usage.recv,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 25);

    return NextResponse.json(topClients);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
