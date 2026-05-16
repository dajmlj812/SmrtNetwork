import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import { cached } from "@/lib/meraki/cache";

// Short coalesce window so multiple cards/tabs refreshing at the same instant
// share one Meraki snapshot generation (~3s each).
const TTL_MS = 5 * 1000;

interface SnapshotResponse {
  url: string;
  expiry: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ serial: string }> }
) {
  const { serial } = await params;
  if (!serial) {
    return NextResponse.json({ error: "serial is required" }, { status: 400 });
  }

  try {
    const snap = await cached<SnapshotResponse>(
      `meraki:camera-snapshot:${serial}`,
      TTL_MS,
      () => meraki.camera.generateSnapshot(serial)
    );
    return NextResponse.json(snap);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
