import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const BASE_DIR = process.env.SMRT_DATA_DIR ?? process.cwd();
const CONFIG_PATH = join(BASE_DIR, "smrt-config.json");

export interface AppConfig {
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
  networkThresholds?: Record<string, number>;
  slackWebhookUrl?: string;
  teamsWebhookUrl?: string;
  reportSchedule?: "none" | "daily" | "weekly";
  activeOrgId?: string;
  appPasswordHash?: string;
  readonlyPasswordHash?: string;
  alertMutedUntil?: string;
  sessionTimeoutDays?: number;
  ldapEnabled?: boolean;
  ldapUrl?: string;
  ldapBaseDn?: string;
  ldapBindDn?: string;
  ldapBindPassword?: string;
  ldapUserFilter?: string;
  ldapAdminGroup?: string;
  ldapReadonlyGroup?: string;
  // ServiceNow
  serviceNowEnabled?: boolean;
  serviceNowInstanceUrl?: string;
  serviceNowUsername?: string;
  serviceNowPassword?: string;
  serviceNowAssignmentGroup?: string;
  serviceNowCategory?: string;
  serviceNowCmdbCi?: string;
  // Jira
  jiraEnabled?: boolean;
  jiraUrl?: string;
  jiraEmail?: string;
  jiraApiToken?: string;
  jiraProjectKey?: string;
  jiraIssueType?: string;
  // InfluxDB
  influxDbEnabled?: boolean;
  influxDbUrl?: string;
  influxDbMode?: "v1" | "v2";
  influxDbOrg?: string;
  influxDbBucket?: string;
  influxDbToken?: string;
  influxDbDatabase?: string;
  influxDbUsername?: string;
  influxDbPassword?: string;
  // Generic health webhook
  healthWebhookUrls?: string;
  // Org-wide health summary email
  healthSummarySchedule?: "none" | "daily" | "weekly";
  healthSummaryTo?: string;
  // Per-network report recipients (networkId → comma-separated emails)
  networkReportRecipients?: Record<string, string>;
}

export function readConfig(): AppConfig {
  try {
    if (!existsSync(CONFIG_PATH)) return {};
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as AppConfig;
  } catch {
    return {};
  }
}

export function writeConfig(updates: Partial<AppConfig>): void {
  const current = readConfig();
  writeFileSync(CONFIG_PATH, JSON.stringify({ ...current, ...updates }, null, 2));
}

export function getMerakiApiKey(): string {
  return readConfig().merakiApiKey ?? process.env.MERAKI_API_KEY ?? "";
}

export function getMerakiBaseUrl(): string {
  return (
    readConfig().merakiBaseUrl ??
    process.env.MERAKI_BASE_URL ??
    "https://api.meraki.com/api/v1"
  );
}

export function getAnthropicApiKey(): string {
  return readConfig().anthropicApiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
}

export function maskKey(key: string | undefined): string {
  if (!key || key.length < 8) return "";
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

export function getSmtpConfig() {
  const c = readConfig();
  return {
    host: c.smtpHost ?? process.env.SMTP_HOST ?? "",
    port: c.smtpPort ?? Number(process.env.SMTP_PORT ?? 587),
    user: c.smtpUser ?? process.env.SMTP_USER ?? "",
    pass: c.smtpPass ?? process.env.SMTP_PASS ?? "",
    from: c.smtpFrom ?? process.env.SMTP_FROM ?? "",
    to: c.smtpTo ?? process.env.SMTP_TO ?? "",
  };
}

export function getActiveOrgId(): string {
  return readConfig().activeOrgId ?? "757480";
}

export function getAlertingConfig() {
  const c = readConfig();
  return {
    enabled: c.alertingEnabled ?? false,
    threshold: c.alertThreshold ?? 80,
    cooldownMinutes: c.alertCooldownMinutes ?? 60,
  };
}

export function getNetworkThreshold(networkId: string): number {
  const c = readConfig();
  return c.networkThresholds?.[networkId] ?? c.alertThreshold ?? 80;
}

export function isAlertMuted(): boolean {
  const until = readConfig().alertMutedUntil;
  if (!until) return false;
  return new Date(until) > new Date();
}

export function getSessionTimeoutSeconds(): number {
  const days = readConfig().sessionTimeoutDays ?? 7;
  return days * 24 * 60 * 60;
}

export function getLdapConfig() {
  const c = readConfig();
  return {
    enabled: c.ldapEnabled ?? false,
    url: c.ldapUrl ?? "",
    baseDn: c.ldapBaseDn ?? "",
    bindDn: c.ldapBindDn,
    bindPassword: c.ldapBindPassword,
    userFilter: c.ldapUserFilter ?? "(sAMAccountName={{username}})",
    adminGroup: c.ldapAdminGroup,
    readonlyGroup: c.ldapReadonlyGroup,
  };
}

function splitUrls(val?: string): string[] {
  return (val ?? "").split(",").map((u) => u.trim()).filter(Boolean);
}

export function getWebhookConfig() {
  const c = readConfig();
  return {
    slack: splitUrls(c.slackWebhookUrl),
    teams: splitUrls(c.teamsWebhookUrl),
    health: splitUrls(c.healthWebhookUrls),
  };
}

export function getIntegrationConfigs() {
  const c = readConfig();
  return {
    serviceNow: {
      enabled: c.serviceNowEnabled ?? false,
      instanceUrl: c.serviceNowInstanceUrl ?? "",
      username: c.serviceNowUsername ?? "",
      passwordSet: !!c.serviceNowPassword,
      password: c.serviceNowPassword,
      assignmentGroup: c.serviceNowAssignmentGroup ?? "",
      category: c.serviceNowCategory ?? "",
      cmdbCi: c.serviceNowCmdbCi ?? "",
    },
    jira: {
      enabled: c.jiraEnabled ?? false,
      url: c.jiraUrl ?? "",
      email: c.jiraEmail ?? "",
      apiTokenSet: !!c.jiraApiToken,
      projectKey: c.jiraProjectKey ?? "",
      issueType: c.jiraIssueType ?? "Bug",
    },
    influxDb: {
      enabled: c.influxDbEnabled ?? false,
      url: c.influxDbUrl ?? "",
      mode: c.influxDbMode ?? "v2" as "v1" | "v2",
      org: c.influxDbOrg ?? "",
      bucket: c.influxDbBucket ?? "",
      tokenSet: !!c.influxDbToken,
      database: c.influxDbDatabase ?? "",
      username: c.influxDbUsername ?? "",
      passwordSet: !!c.influxDbPassword,
    },
    healthWebhookUrls: c.healthWebhookUrls ?? "",
  };
}
