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
  getLdapConfig,
  maskKey,
} from "@/lib/config";
import { appendAuditEntry } from "@/lib/audit-log";

export async function GET() {
  const merakiKey    = getMerakiApiKey();
  const anthropicKey = getAnthropicApiKey();
  const baseUrl      = getMerakiBaseUrl();
  const smtp         = getSmtpConfig();
  const smtpConfigured = !!(smtp.host && smtp.user && smtp.pass);
  const alerting     = getAlertingConfig();
  const webhooks     = getWebhookConfig();
  const config       = readConfig();
  const ldap         = getLdapConfig();

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
    slackWebhookUrl:  config.slackWebhookUrl ?? "",
    teamsWebhookUrl:  config.teamsWebhookUrl ?? "",
    slackWebhookSet:  webhooks.slack.length > 0,
    teamsWebhookSet:  webhooks.teams.length > 0,
    reportSchedule:   config.reportSchedule ?? "none",
    activeOrgId:      getActiveOrgId(),
    appPasswordSet:   !!config.appPasswordHash,
    readonlyPasswordSet: !!config.readonlyPasswordHash,
    alertMutedUntil:  config.alertMutedUntil ?? null,
    sessionTimeoutDays: config.sessionTimeoutDays ?? 7,
    ldapEnabled:       ldap.enabled,
    ldapUrl:           ldap.url,
    ldapBaseDn:        ldap.baseDn,
    ldapBindDn:        ldap.bindDn ?? "",
    ldapBindPasswordSet: !!config.ldapBindPassword,
    ldapUserFilter:    ldap.userFilter,
    ldapAdminGroup:    ldap.adminGroup ?? "",
    ldapReadonlyGroup: ldap.readonlyGroup ?? "",
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
      sessionTimeoutDays: number;
      ldapEnabled: boolean;
      ldapUrl: string;
      ldapBaseDn: string;
      ldapBindDn: string;
      ldapBindPassword: string;
      ldapUserFilter: string;
      ldapAdminGroup: string;
      ldapReadonlyGroup: string;
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
    if (body.sessionTimeoutDays != null) {
      const days = Number(body.sessionTimeoutDays);
      if (days >= 1 && days <= 365) updates.sessionTimeoutDays = days;
    }
    if (body.ldapEnabled != null) updates.ldapEnabled = Boolean(body.ldapEnabled);
    if (typeof body.ldapUrl === "string") updates.ldapUrl = body.ldapUrl.trim();
    if (typeof body.ldapBaseDn === "string") updates.ldapBaseDn = body.ldapBaseDn.trim();
    if (typeof body.ldapBindDn === "string") updates.ldapBindDn = body.ldapBindDn.trim();
    if (typeof body.ldapBindPassword === "string" && body.ldapBindPassword.trim())
      updates.ldapBindPassword = body.ldapBindPassword.trim();
    if (typeof body.ldapUserFilter === "string" && body.ldapUserFilter.trim())
      updates.ldapUserFilter = body.ldapUserFilter.trim();
    if (typeof body.ldapAdminGroup === "string") updates.ldapAdminGroup = body.ldapAdminGroup.trim();
    if (typeof body.ldapReadonlyGroup === "string") updates.ldapReadonlyGroup = body.ldapReadonlyGroup.trim();

    if (Object.keys(updates).length === 0)
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });

    writeConfig(updates);
    const changed = Object.keys(updates).join(", ");
    appendAuditEntry("settings.save", `Updated: ${changed}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
