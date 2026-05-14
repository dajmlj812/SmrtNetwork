import { NextResponse } from "next/server";
import { getAlertingConfig, getSmtpConfig } from "@/lib/config";

export async function GET() {
  const alerting = getAlertingConfig();
  const smtp = getSmtpConfig();
  const smtpConfigured = !!(smtp.host && smtp.user && smtp.pass && smtp.to);

  return NextResponse.json({
    enabled: alerting.enabled,
    threshold: alerting.threshold,
    cooldownMinutes: alerting.cooldownMinutes,
    smtpConfigured,
  });
}
