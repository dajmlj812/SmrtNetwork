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
  getIntegrationConfigs,
  getSessionTimeoutMinutes,
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
  const integrations = getIntegrationConfigs();

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
    sessionTimeoutMinutes: getSessionTimeoutMinutes(),
    inactivityTimeoutMinutes: config.inactivityTimeoutMinutes ?? 0,
    ldapEnabled:       ldap.enabled,
    ldapUrl:           ldap.url,
    ldapBaseDn:        ldap.baseDn,
    ldapBindDn:        ldap.bindDn ?? "",
    ldapBindPasswordSet: !!config.ldapBindPassword,
    ldapUserFilter:    ldap.userFilter,
    ldapAdminGroup:    ldap.adminGroup ?? "",
    ldapReadonlyGroup: ldap.readonlyGroup ?? "",
    // Integrations
    serviceNowEnabled:         integrations.serviceNow.enabled,
    serviceNowInstanceUrl:     integrations.serviceNow.instanceUrl,
    serviceNowUsername:        integrations.serviceNow.username,
    serviceNowPasswordSet:     integrations.serviceNow.passwordSet,
    serviceNowAssignmentGroup: integrations.serviceNow.assignmentGroup,
    serviceNowCategory:        integrations.serviceNow.category,
    serviceNowCmdbCi:          integrations.serviceNow.cmdbCi,
    jiraEnabled:      integrations.jira.enabled,
    jiraUrl:          integrations.jira.url,
    jiraEmail:        integrations.jira.email,
    jiraApiTokenSet:  integrations.jira.apiTokenSet,
    jiraProjectKey:   integrations.jira.projectKey,
    jiraIssueType:    integrations.jira.issueType,
    influxDbEnabled:   integrations.influxDb.enabled,
    influxDbUrl:       integrations.influxDb.url,
    influxDbMode:      integrations.influxDb.mode,
    influxDbOrg:       integrations.influxDb.org,
    influxDbBucket:    integrations.influxDb.bucket,
    influxDbTokenSet:  integrations.influxDb.tokenSet,
    influxDbDatabase:  integrations.influxDb.database,
    influxDbUsername:  integrations.influxDb.username,
    influxDbPasswordSet: integrations.influxDb.passwordSet,
    healthWebhookUrls: integrations.healthWebhookUrls,
    healthSummarySchedule: config.healthSummarySchedule ?? "none",
    healthSummaryTo: config.healthSummaryTo ?? "",
    networkReportRecipients: config.networkReportRecipients ?? {},
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
      healthSummarySchedule: "none" | "daily" | "weekly";
      healthSummaryTo: string;
      networkReportRecipients: Record<string, string>;
      activeOrgId: string;
      alertMutedUntil: string | undefined;
      sessionTimeoutMinutes: number;
      inactivityTimeoutMinutes: number;
      ldapEnabled: boolean;
      ldapUrl: string;
      ldapBaseDn: string;
      ldapBindDn: string;
      ldapBindPassword: string;
      ldapUserFilter: string;
      ldapAdminGroup: string;
      ldapReadonlyGroup: string;
      // Integrations
      serviceNowEnabled: boolean;
      serviceNowInstanceUrl: string;
      serviceNowUsername: string;
      serviceNowPassword: string;
      serviceNowAssignmentGroup: string;
      serviceNowCategory: string;
      serviceNowCmdbCi: string;
      jiraEnabled: boolean;
      jiraUrl: string;
      jiraEmail: string;
      jiraApiToken: string;
      jiraProjectKey: string;
      jiraIssueType: string;
      influxDbEnabled: boolean;
      influxDbUrl: string;
      influxDbMode: "v1" | "v2";
      influxDbOrg: string;
      influxDbBucket: string;
      influxDbToken: string;
      influxDbDatabase: string;
      influxDbUsername: string;
      influxDbPassword: string;
      healthWebhookUrls: string;
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
    if (body.healthSummarySchedule != null) {
      const val = body.healthSummarySchedule;
      if (val === "none" || val === "daily" || val === "weekly")
        updates.healthSummarySchedule = val;
    }
    if (typeof body.healthSummaryTo === "string")
      updates.healthSummaryTo = body.healthSummaryTo.trim();
    if (body.networkReportRecipients != null && typeof body.networkReportRecipients === "object") {
      const existing = readConfig().networkReportRecipients ?? {};
      updates.networkReportRecipients = { ...existing, ...(body.networkReportRecipients as Record<string, string>) };
    }
    if (typeof body.activeOrgId === "string" && body.activeOrgId.trim())
      updates.activeOrgId = body.activeOrgId.trim();
    if ("alertMutedUntil" in body) {
      updates.alertMutedUntil =
        typeof body.alertMutedUntil === "string" && body.alertMutedUntil.trim()
          ? body.alertMutedUntil.trim()
          : undefined;
    }
    if (body.sessionTimeoutMinutes != null) {
      const minutes = Number(body.sessionTimeoutMinutes);
      // Floor at 5 minutes — going lower invites instant self-lockout
      // after saving (the user's own session immediately expires). Cap at
      // 365 days to match the prior `sessionTimeoutDays` upper bound.
      if (Number.isFinite(minutes) && minutes >= 5 && minutes <= 365 * 24 * 60) {
        updates.sessionTimeoutMinutes = Math.floor(minutes);
      }
    }
    if (body.inactivityTimeoutMinutes != null) {
      const minutes = Number(body.inactivityTimeoutMinutes);
      if (Number.isFinite(minutes) && minutes >= 0 && minutes <= 1440) {
        updates.inactivityTimeoutMinutes = Math.floor(minutes);
      }
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

    // ServiceNow
    if (body.serviceNowEnabled != null) updates.serviceNowEnabled = Boolean(body.serviceNowEnabled);
    if (typeof body.serviceNowInstanceUrl === "string") updates.serviceNowInstanceUrl = body.serviceNowInstanceUrl.trim();
    if (typeof body.serviceNowUsername === "string") updates.serviceNowUsername = body.serviceNowUsername.trim();
    if (typeof body.serviceNowPassword === "string" && body.serviceNowPassword.trim()) updates.serviceNowPassword = body.serviceNowPassword.trim();
    if (typeof body.serviceNowAssignmentGroup === "string") updates.serviceNowAssignmentGroup = body.serviceNowAssignmentGroup.trim();
    if (typeof body.serviceNowCategory === "string") updates.serviceNowCategory = body.serviceNowCategory.trim();
    if (typeof body.serviceNowCmdbCi === "string") updates.serviceNowCmdbCi = body.serviceNowCmdbCi.trim();
    // Jira
    if (body.jiraEnabled != null) updates.jiraEnabled = Boolean(body.jiraEnabled);
    if (typeof body.jiraUrl === "string") updates.jiraUrl = body.jiraUrl.trim();
    if (typeof body.jiraEmail === "string") updates.jiraEmail = body.jiraEmail.trim();
    if (typeof body.jiraApiToken === "string" && body.jiraApiToken.trim()) updates.jiraApiToken = body.jiraApiToken.trim();
    if (typeof body.jiraProjectKey === "string") updates.jiraProjectKey = body.jiraProjectKey.trim();
    if (typeof body.jiraIssueType === "string" && body.jiraIssueType.trim()) updates.jiraIssueType = body.jiraIssueType.trim();
    // InfluxDB
    if (body.influxDbEnabled != null) updates.influxDbEnabled = Boolean(body.influxDbEnabled);
    if (typeof body.influxDbUrl === "string") updates.influxDbUrl = body.influxDbUrl.trim();
    if (body.influxDbMode === "v1" || body.influxDbMode === "v2") updates.influxDbMode = body.influxDbMode;
    if (typeof body.influxDbOrg === "string") updates.influxDbOrg = body.influxDbOrg.trim();
    if (typeof body.influxDbBucket === "string") updates.influxDbBucket = body.influxDbBucket.trim();
    if (typeof body.influxDbToken === "string" && body.influxDbToken.trim()) updates.influxDbToken = body.influxDbToken.trim();
    if (typeof body.influxDbDatabase === "string") updates.influxDbDatabase = body.influxDbDatabase.trim();
    if (typeof body.influxDbUsername === "string") updates.influxDbUsername = body.influxDbUsername.trim();
    if (typeof body.influxDbPassword === "string" && body.influxDbPassword.trim()) updates.influxDbPassword = body.influxDbPassword.trim();
    // Generic health webhook
    if (typeof body.healthWebhookUrls === "string") updates.healthWebhookUrls = body.healthWebhookUrls.trim();

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
