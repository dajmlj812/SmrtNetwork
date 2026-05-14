import { NextRequest, NextResponse } from "next/server";
import {
  getSnapshotsForNetwork,
  writeSnapshot,
} from "@/lib/snapshots";

export async function GET(req: NextRequest) {
  const networkId = req.nextUrl.searchParams.get("networkId");
  const limitParam = req.nextUrl.searchParams.get("limit");

  if (!networkId) {
    return NextResponse.json({ error: "networkId is required" }, { status: 400 });
  }

  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : 30;
  const snapshots = getSnapshotsForNetwork(networkId, limit);
  return NextResponse.json(snapshots);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      networkId?: string;
      networkName?: string;
      stats?: {
        total: number;
        online: number;
        offline: number;
        alerting: number;
        dormant: number;
        clientCount: number;
        healthScore: number;
      };
    };

    if (!body.networkId || !body.networkName || !body.stats) {
      return NextResponse.json(
        { error: "networkId, networkName, and stats are required" },
        { status: 400 }
      );
    }

    const snapshot = writeSnapshot({
      networkId: body.networkId,
      networkName: body.networkName,
      stats: body.stats,
    });

    return NextResponse.json(snapshot, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
