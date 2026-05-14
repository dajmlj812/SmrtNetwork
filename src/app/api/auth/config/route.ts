import { NextResponse } from "next/server";
import { readConfig } from "@/lib/config";

export async function GET() {
  const cfg = readConfig();
  return NextResponse.json({ ldapEnabled: cfg.ldapEnabled ?? false });
}
