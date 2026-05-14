import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  try {
    const statuses = await meraki.vpn.statuses(orgId);
    const filtered = statuses.filter((s) => s.vpnMode !== "none");
    return NextResponse.json(filtered);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Gracefully handle orgs that don't have VPN-capable appliances
    if (message.includes("404") || message.includes("400")) {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
