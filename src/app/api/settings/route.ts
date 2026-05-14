import { NextRequest, NextResponse } from "next/server";
import {
  readConfig,
  writeConfig,
  getMerakiApiKey,
  getMerakiBaseUrl,
  getAnthropicApiKey,
  getSmtpConfig,
  getAlertingConfig,
  getWebhookConfig,
  getActiveOrgId,
  maskKey,
} from "@/lib/config";

export async function GET() {
  const merakiKey    = getMerakiApiKey();
  const anthropicKey = getAnthropicApiKey();
  const baseUrl      = getMerakiBaseUrl();
  const smtp         = getSmtpConfig();
  const smtpConfigured = !!(smtp.host && smtp.user && smtp.pass);
  const alerting     = getAlertingConfig();
  const webhooks     = getWebhookConfig();
  const config       = readConfig();

  return NextResponse.json({
    merakiApiKeySet:      !!merakiKey,
    merakiApiKeyMasked:   maskKey(merakiKey),
    merakiBaseUrl:        baseUrl,
    anthropicApiKeySet:   !!anthropicKey,
    anthropicApiKeyMasked: maskKey(anthropicKey),
    source:           Object.keys(config).length > 0 ? "config-file" : "env",
    smtpConfigured,
    smtpHost:         smtp.host,
    smtpPort:         smtp.port,
    smtpFrom:         smtp.from,
    smtpTo:           smtp.to,
    alertingEnabled:       alerting.enabled,
    alertThreshold:        alerting.threshold,
    alertCooldownMinutes:  alerting.cooldownMinutes,
    networkThresholds:     config.networkThresholds ?? {},
    // Expose raw comma-separated strings for the settings UI
    slackWebhookUrl:  config.slackWebhookUrl ?? "",
    teamsWebhookUrl:  config.teamsWebhookUrl ?? "",
    slackWebhookSet:  webhooks.slack.length > 0,
    teamsWebhookSet:  webhooks.teams.length > 0,
    reportSchedule:   config.reportSchedule ?? "none",
    activeOrgId:      getActiveOrgId(),
    appPasswordSet:   !!config.appPasswordHash,
    alertMutedUntil:  config.alertMutedUntil ?? null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;

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
      networkThresholds: Record<string, number>;
      slackWebhookUrl: string;
      teamsWebhookUrl: string;
      reportSchedule: "none" | "daily" | "weekly";
      activeOrgId: string;
      alertMutedUntil: string | undefined;
    }> = {};

    if (typeof body.merakiApiKey === "string" && body.merakiApiKey.trim())
      updates.merakiApiKey = body.merakiApiKey.trim();
    if (typeof body.merakiBaseUrl === "string" && body.merakiBaseUrl.trim())
      updates.merakiBaseUrl = body.merakiBaseUrl.trim();
    if (typeof body.anthropicApiKey === "string" && body.anthropicApiKey.trim())
      updates.anthropicApiKey = body.anthropicApiKey.trim();
    if (typeof body.smtpHost === "string" && body.smtpHost.trim())
      updates.smtpHost = body.smtpHost.trim();
    if (body.smtpPort != null) updates.smtpPort = Number(body.smtpPort);
    if (typeof body.smtpUser === "string" && body.smtpUser.trim())
      updates.smtpUser = body.smtpUser.trim();
    if (typeof body.smtpPass === "string" && body.smtpPass.trim())
      updates.smtpPass = body.smtpPass.trim();
    if (typeof body.smtpFrom === "string" && body.smtpFrom.trim())
      updates.smtpFrom = body.smtpFrom.trim();
    if (typeof body.smtpTo === "string" && body.smtpTo.trim())
      updates.smtpTo = body.smtpTo.trim();
    if (body.alertingEnabled != null) updates.alertingEnabled = Boolean(body.alertingEnabled);
    if (body.alertThreshold != null) updates.alertThreshold = Number(body.alertThreshold);
    if (body.alertCooldownMinutes != null)
      updates.alertCooldownMinutes = Number(body.alertCooldownMinutes);
    if (body.networkThresholds != null && typeof body.networkThresholds === "object")
      updates.networkThresholds = body.networkThresholds as Record<string, number>;
    if (typeof body.slackWebhookUrl === "string" && body.slackWebhookUrl.trim())
      updates.slackWebhookUrl = body.slackWebhookUrl.trim();
    if (typeof body.teamsWebhookUrl === "string" && body.teamsWebhookUrl.trim())
      updates.teamsWebhookUrl = body.teamsWebhookUrl.trim();
    if (body.reportSchedule != null) {
      const val = body.reportSchedule;
      if (val === "none" || val === "daily" || val === "weekly")
        updates.reportSchedule = val;
    }
    if (typeof body.activeOrgId === "string" && body.activeOrgId.trim())
      updates.activeOrgId = body.activeOrgId.trim();
    if ("alertMutedUntil" in body) {
      updates.alertMutedUntil =
        typeof body.alertMutedUntil === "string" && body.alertMutedUntil.trim()
          ? body.alertMutedUntil.trim()
          : undefined;
    }

    if (Object.keys(updates).length === 0)
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });

    writeConfig(updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
