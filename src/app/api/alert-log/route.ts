import { NextRequest, NextResponse } from "next/server";
import { readAlertLog } from "@/lib/alert-log";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 500);

  const all = readAlertLog();
  // Return most recent first
  const recent = all.slice().reverse().slice(0, limit);

  return NextResponse.json(recent);
}
