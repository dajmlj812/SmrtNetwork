import { NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import { cached } from "@/lib/meraki/cache";

// Orgs change very rarely — 10 minute TTL is safe and eliminates 429 storms.
const TTL_MS = 10 * 60 * 1000;

export async function GET() {
  try {
    const orgs = await cached("meraki:organizations", TTL_MS, () =>
      meraki.organizations.list()
    );
    return NextResponse.json(orgs);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
