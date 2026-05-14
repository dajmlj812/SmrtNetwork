import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";

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
      const clients = await meraki.clients.listByDevice(serial, timespan);
      return NextResponse.json(clients);
    }
    if (networkId) {
      const clients = await meraki.clients.listByNetwork(networkId, timespan);
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
