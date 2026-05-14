import { NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";

export async function GET() {
  try {
    const orgs = await meraki.organizations.list();
    return NextResponse.json(orgs);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
