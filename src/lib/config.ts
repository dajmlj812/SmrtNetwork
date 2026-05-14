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
  alertThreshold?: number; // health score below this triggers an alert (default 80)
  alertCooldownMinutes?: number; // minimum minutes between alerts for same network (default 60)
  slackWebhookUrl?: string;
  teamsWebhookUrl?: string;
  reportSchedule?: "none" | "daily" | "weekly";
  activeOrgId?: string;
  appPasswordHash?: string;
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

export function getWebhookConfig() {
  const c = readConfig();
  return {
    slack: c.slackWebhookUrl ?? "",
    teams: c.teamsWebhookUrl ?? "",
  };
}
