import { NextRequest, NextResponse } from "next/server";
import {
  readConfig,
  writeConfig,
  getMerakiApiKey,
  getMerakiBaseUrl,
  getAnthropicApiKey,
  getSmtpConfig,
  getAlertingConfig,
  maskKey,
} from "@/lib/config";

export async function GET() {
  const merakiKey = getMerakiApiKey();
  const anthropicKey = getAnthropicApiKey();
  const baseUrl = getMerakiBaseUrl();
  const smtp = getSmtpConfig();
  const smtpConfigured = !!(smtp.host && smtp.user && smtp.pass);
  const alerting = getAlertingConfig();

  return NextResponse.json({
    merakiApiKeySet: !!merakiKey,
    merakiApiKeyMasked: maskKey(merakiKey),
    merakiBaseUrl: baseUrl,
    anthropicApiKeySet: !!anthropicKey,
    anthropicApiKeyMasked: maskKey(anthropicKey),
    source: Object.keys(readConfig()).length > 0 ? "config-file" : "env",
    smtpConfigured,
    smtpHost: smtp.host,
    smtpPort: smtp.port,
    smtpFrom: smtp.from,
    smtpTo: smtp.to,
    alertingEnabled: alerting.enabled,
    alertThreshold: alerting.threshold,
    alertCooldownMinutes: alerting.cooldownMinutes,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      merakiApiKey?: string;
      merakiBaseUrl?: string;
      anthropicApiKey?: string;
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPass?: string;
      smtpFrom?: string;
      smtpTo?: string;
      alertingEnabled?: boolean;
      alertThreshold?: number;
      alertCooldownMinutes?: number;
    };

    const updates: Partial<{
      merakiApiKey: string;
      merakiBaseUrl: string;
      anthropicApiKey: string;
      smtpHost: string;
      smtpPort: number;
      smtpUser: string;
      smtpPass: string;
      smtpFrom: string;
      smtpTo: string;
      alertingEnabled: boolean;
      alertThreshold: number;
      alertCooldownMinutes: number;
    }> = {};

    if (body.merakiApiKey?.trim()) updates.merakiApiKey = body.merakiApiKey.trim();
    if (body.merakiBaseUrl?.trim()) updates.merakiBaseUrl = body.merakiBaseUrl.trim();
    if (body.anthropicApiKey?.trim()) updates.anthropicApiKey = body.anthropicApiKey.trim();
    if (body.smtpHost?.trim()) updates.smtpHost = body.smtpHost.trim();
    if (body.smtpPort != null) updates.smtpPort = Number(body.smtpPort);
    if (body.smtpUser?.trim()) updates.smtpUser = body.smtpUser.trim();
    if (body.smtpPass?.trim()) updates.smtpPass = body.smtpPass.trim();
    if (body.smtpFrom?.trim()) updates.smtpFrom = body.smtpFrom.trim();
    if (body.smtpTo?.trim()) updates.smtpTo = body.smtpTo.trim();
    if (body.alertingEnabled != null) updates.alertingEnabled = Boolean(body.alertingEnabled);
    if (body.alertThreshold != null) updates.alertThreshold = Number(body.alertThreshold);
    if (body.alertCooldownMinutes != null) updates.alertCooldownMinutes = Number(body.alertCooldownMinutes);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
    }

    writeConfig(updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
