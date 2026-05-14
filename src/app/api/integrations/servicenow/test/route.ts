import { NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { testServiceNowConnection } from "@/lib/servicenow";

export async function POST() {
  const cfg = readConfig();
  if (!cfg.serviceNowInstanceUrl || !cfg.serviceNowUsername || !cfg.serviceNowPassword) {
    return NextResponse.json({ error: "ServiceNow is not configured" }, { status: 400 });
  }
  const result = await testServiceNowConnection({
    instanceUrl: cfg.serviceNowInstanceUrl,
    username: cfg.serviceNowUsername,
    password: cfg.serviceNowPassword,
  });
  return NextResponse.json(result);
}
