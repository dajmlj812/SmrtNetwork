import { NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { testInfluxDbConnection } from "@/lib/influxdb";

export async function POST() {
  const cfg = readConfig();
  if (!cfg.influxDbUrl) {
    return NextResponse.json({ error: "InfluxDB is not configured" }, { status: 400 });
  }
  const result = await testInfluxDbConnection({
    url: cfg.influxDbUrl,
    mode: cfg.influxDbMode ?? "v2",
    token: cfg.influxDbToken,
    username: cfg.influxDbUsername,
    password: cfg.influxDbPassword,
  });
  return NextResponse.json(result);
}
