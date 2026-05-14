import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import type { Client } from "@/lib/meraki/types";

export interface BandwidthPeriod {
  label: string;
  timespan: number;
  sent: number;
  recv: number;
  total: number;
  clients: number;
}

const TIMESPANS: { timespan: number; label: string }[] = [
  { timespan: 3600, label: "Last hour" },
  { timespan: 21600, label: "Last 6 hours" },
  { timespan: 86400, label: "Last 24 hours" },
  { timespan: 604800, label: "Last 7 days" },
];

export async function GET(req: NextRequest) {
  const networkId = req.nextUrl.searchParams.get("networkId");

  if (!networkId) {
    return NextResponse.json({ error: "networkId is required" }, { status: 400 });
  }

  const results = await Promise.allSettled(
    TIMESPANS.map(({ timespan }) => meraki.clients.listByNetwork(networkId, timespan))
  );

  const periods: BandwidthPeriod[] = results.map((result, i) => {
    const { timespan, label } = TIMESPANS[i];

    if (result.status === "rejected") {
      return { label, timespan, sent: 0, recv: 0, total: 0, clients: 0 };
    }

    const clients: Client[] = result.value;
    let sent = 0;
    let recv = 0;
    for (const client of clients) {
      sent += client.usage.sent ?? 0;
      recv += client.usage.recv ?? 0;
    }
    const total = sent + recv;

    return { label, timespan, sent, recv, total, clients: clients.length };
  });

  return NextResponse.json(periods);
}
