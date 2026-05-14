import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }
  try {
    const networks = await meraki.networks.list(orgId);
    return NextResponse.json(networks);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
