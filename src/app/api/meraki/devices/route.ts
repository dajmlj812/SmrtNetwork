import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";

export async function GET(req: NextRequest) {
  const networkId = req.nextUrl.searchParams.get("networkId");
  const orgId = req.nextUrl.searchParams.get("orgId");

  try {
    if (orgId) {
      const statuses = await meraki.devices.getStatuses(orgId);
      return NextResponse.json(statuses);
    }
    if (networkId) {
      const devices = await meraki.devices.list(networkId);
      return NextResponse.json(devices);
    }
    return NextResponse.json(
      { error: "networkId or orgId is required" },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
