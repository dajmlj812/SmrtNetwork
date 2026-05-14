"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsStatus {
  merakiApiKeySet: boolean;
  merakiApiKeyMasked: string;
  merakiBaseUrl: string;
  anthropicApiKeySet: boolean;
  anthropicApiKeyMasked: string;
  source: string;
  smtpConfigured: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpFrom: string;
  smtpTo: string;
  alertingEnabled: boolean;
  alertThreshold: number;
  alertCooldownMinutes: number;
  slackWebhookSet: boolean;
  teamsWebhookSet: boolean;
  reportSchedule: string;
}

function KeyField({
  label,
  fieldKey,
  placeholder,
  current,
  isSet,
  value,
  onChange,
}: {
  label: string;
  fieldKey: string;
  placeholder: string;
  current: string;
  isSet: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={fieldKey} className="text-sm font-medium text-white/80">
          {label}
        </label>
        {isSet && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <CheckCircle size={12} />
            Set — <span className="font-mono">{current}</span>
          </span>
        )}
        {!isSet && (
          <span className="flex items-center gap-1 text-xs text-yellow-400">
            <AlertCircle size={12} />
            Not configured
          </span>
        )}
      </div>
      <div className="relative">
        <input
          id={fieldKey}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isSet ? "Enter new value to replace…" : placeholder}
          className={cn(
            "w-full px-3 py-2 pr-10 rounded-lg text-sm font-mono",
            "bg-white/5 border border-white/10",
            "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500"
          )}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

function TextField({
  label,
  fieldKey,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  fieldKey: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldKey} className="text-sm font-medium text-white/80 block">
        {label}
      </label>
      <input
        id={fieldKey}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full px-3 py-2 rounded-lg text-sm font-mono",
          "bg-white/5 border border-white/10",
          "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500"
        )}
      />
    </div>
  );
}

export default function SettingsPage() {
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [merakiKey, setMerakiKey] = useState("");
  const [merakiBaseUrl, setMerakiBaseUrl] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");

  // SMTP fields
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [smtpTo, setSmtpTo] = useState("");

  // Alerting fields
  const [alertingEnabled, setAlertingEnabled] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState("80");
  const [alertCooldownMinutes, setAlertCooldownMinutes] = useState("60");

  // Webhook fields
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState("");
  const [testingSlack, setTestingSlack] = useState(false);
  const [testingTeams, setTestingTeams] = useState(false);
  const [slackTestResult, setSlackTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [teamsTestResult, setTeamsTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Report schedule
  const [reportSchedule, setReportSchedule] = useState("none");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: SettingsStatus) => {
        setStatus(data);
        setMerakiBaseUrl(data.merakiBaseUrl);
        setSmtpHost(data.smtpHost ?? "");
        setSmtpPort(data.smtpPort ? String(data.smtpPort) : "587");
        setSmtpFrom(data.smtpFrom ?? "");
        setSmtpTo(data.smtpTo ?? "");
        setAlertingEnabled(data.alertingEnabled ?? false);
        setAlertThreshold(String(data.alertThreshold ?? 80));
        setAlertCooldownMinutes(String(data.alertCooldownMinutes ?? 60));
        setReportSchedule(data.reportSchedule ?? "none");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError(null);

    const body: Record<string, string | number | boolean> = {};
    if (merakiKey.trim()) body.merakiApiKey = merakiKey.trim();
    if (merakiBaseUrl.trim()) body.merakiBaseUrl = merakiBaseUrl.trim();
    if (anthropicKey.trim()) body.anthropicApiKey = anthropicKey.trim();
    if (smtpHost.trim()) body.smtpHost = smtpHost.trim();
    if (smtpPort.trim()) body.smtpPort = Number(smtpPort.trim());
    if (smtpUser.trim()) body.smtpUser = smtpUser.trim();
    if (smtpPass.trim()) body.smtpPass = smtpPass.trim();
    if (smtpFrom.trim()) body.smtpFrom = smtpFrom.trim();
    if (smtpTo.trim()) body.smtpTo = smtpTo.trim();
    body.alertingEnabled = alertingEnabled;
    if (alertThreshold.trim()) body.alertThreshold = Number(alertThreshold.trim());
    if (alertCooldownMinutes.trim()) body.alertCooldownMinutes = Number(alertCooldownMinutes.trim());
    if (slackWebhookUrl.trim()) body.slackWebhookUrl = slackWebhookUrl.trim();
    if (teamsWebhookUrl.trim()) body.teamsWebhookUrl = teamsWebhookUrl.trim();
    body.reportSchedule = reportSchedule;

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      // Refresh status
      const fresh = await fetch("/api/settings").then((r) => r.json()) as SettingsStatus;
      setStatus(fresh);
      setAlertingEnabled(fresh.alertingEnabled ?? false);
      setAlertThreshold(String(fresh.alertThreshold ?? 80));
      setAlertCooldownMinutes(String(fresh.alertCooldownMinutes ?? 60));
      setReportSchedule(fresh.reportSchedule ?? "none");
      setMerakiKey("");
      setAnthropicKey("");
      setSmtpPass("");
      setSlackWebhookUrl("");
      setTeamsWebhookUrl("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSmtp() {
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch("/api/settings/test-smtp", { method: "POST" });
      const data = await res.json() as { ok?: boolean; error?: string; to?: string };
      if (!res.ok) throw new Error(data.error ?? "Test failed");
      setSmtpTestResult({ ok: true, message: `Test email sent to ${data.to}` });
    } catch (err) {
      setSmtpTestResult({ ok: false, message: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setTestingSmtp(false);
    }
  }

  async function handleTestWebhook(channel: "slack" | "teams") {
    if (channel === "slack") {
      setTestingSlack(true);
      setSlackTestResult(null);
    } else {
      setTestingTeams(true);
      setTeamsTestResult(null);
    }

    try {
      const res = await fetch("/api/settings/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      const result = { ok: !!data.ok, message: data.ok ? "Test message sent" : (data.error ?? "Test failed") };
      if (channel === "slack") setSlackTestResult(result);
      else setTeamsTestResult(result);
    } catch (err) {
      const result = { ok: false, message: err instanceof Error ? err.message : "Unknown error" };
      if (channel === "slack") setSlackTestResult(result);
      else setTeamsTestResult(result);
    } finally {
      if (channel === "slack") setTestingSlack(false);
      else setTestingTeams(false);
    }
  }

  const hasChanges =
    !!merakiKey ||
    !!anthropicKey ||
    !!smtpUser ||
    !!smtpPass ||
    !!slackWebhookUrl ||
    !!teamsWebhookUrl ||
    (status && merakiBaseUrl !== status.merakiBaseUrl) ||
    (status && smtpHost !== (status.smtpHost ?? "")) ||
    (status && smtpPort !== String(status.smtpPort ?? 587)) ||
    (status && smtpFrom !== (status.smtpFrom ?? "")) ||
    (status && smtpTo !== (status.smtpTo ?? "")) ||
    (status && alertingEnabled !== (status.alertingEnabled ?? false)) ||
    (status && alertThreshold !== String(status.alertThreshold ?? 80)) ||
    (status && alertCooldownMinutes !== String(status.alertCooldownMinutes ?? 60)) ||
    (status && reportSchedule !== (status.reportSchedule ?? "none"));

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        {status && (
          <p className="text-xs text-white/30 mt-1">
            Keys are stored in{" "}
            <span className="font-mono">smrt-config.json</span> and take effect
            immediately — no restart needed.
          </p>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-white/50">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      )}

      {!loading && status && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Meraki */}
          <div className="rounded-xl border border-white/10 p-5 space-y-4">
            <h2 className="font-semibold text-sm text-white/60 uppercase tracking-wider">
              Cisco Meraki
            </h2>
            <KeyField
              label="API Key"
              fieldKey="merakiApiKey"
              placeholder="40-character hex key from Meraki Dashboard"
              current={status.merakiApiKeyMasked}
              isSet={status.merakiApiKeySet}
              value={merakiKey}
              onChange={setMerakiKey}
            />
            <div className="space-y-1.5">
              <label htmlFor="merakiBaseUrl" className="text-sm font-medium text-white/80">
                Base URL
              </label>
              <input
                id="merakiBaseUrl"
                type="text"
                value={merakiBaseUrl}
                onChange={(e) => setMerakiBaseUrl(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-sm font-mono",
                  "bg-white/5 border border-white/10",
                  "focus:outline-none focus:ring-1 focus:ring-blue-500"
                )}
              />
              <p className="text-xs text-white/30">
                Change only if using a Meraki Government or private cloud instance.
              </p>
            </div>
          </div>

          {/* Anthropic */}
          <div className="rounded-xl border border-white/10 p-5 space-y-4">
            <h2 className="font-semibold text-sm text-white/60 uppercase tracking-wider">
              Anthropic / Claude
            </h2>
            <KeyField
              label="API Key"
              fieldKey="anthropicApiKey"
              placeholder="sk-ant-api03-…"
              current={status.anthropicApiKeyMasked}
              isSet={status.anthropicApiKeySet}
              value={anthropicKey}
              onChange={setAnthropicKey}
            />
          </div>

          {/* SMTP / Email Reports */}
          <div className="rounded-xl border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-white/60 uppercase tracking-wider flex items-center gap-2">
                <Mail size={14} />
                Email Reports
              </h2>
              {status.smtpConfigured ? (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle size={12} />
                  SMTP configured
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-white/30">
                  <AlertCircle size={12} />
                  Not configured
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="SMTP Host"
                fieldKey="smtpHost"
                placeholder="smtp.example.com"
                value={smtpHost}
                onChange={setSmtpHost}
              />
              <TextField
                label="Port"
                fieldKey="smtpPort"
                placeholder="587"
                value={smtpPort}
                onChange={setSmtpPort}
                type="number"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="smtpUser" className="text-sm font-medium text-white/80 block">
                Username
              </label>
              <input
                id="smtpUser"
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder={status.smtpConfigured ? "Enter new value to replace…" : "user@example.com"}
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-sm font-mono",
                  "bg-white/5 border border-white/10",
                  "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500"
                )}
              />
            </div>

            <KeyField
              label="Password"
              fieldKey="smtpPass"
              placeholder="SMTP password or app password"
              current=""
              isSet={status.smtpConfigured}
              value={smtpPass}
              onChange={setSmtpPass}
            />

            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="From Address"
                fieldKey="smtpFrom"
                placeholder="reports@example.com"
                value={smtpFrom}
                onChange={setSmtpFrom}
              />
              <TextField
                label="To Address"
                fieldKey="smtpTo"
                placeholder="noc@example.com"
                value={smtpTo}
                onChange={setSmtpTo}
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={testingSmtp || !status.smtpConfigured}
                title={!status.smtpConfigured ? "Save SMTP credentials first" : undefined}
                className="px-4 py-1.5 rounded-lg border border-white/15 hover:border-white/30 disabled:opacity-40 text-sm transition-colors flex items-center gap-2"
              >
                {testingSmtp && <Loader2 size={13} className="animate-spin" />}
                <Mail size={13} />
                {testingSmtp ? "Sending…" : "Send Test Email"}
              </button>
              {smtpTestResult && (
                <span className={cn(
                  "flex items-center gap-1.5 text-sm",
                  smtpTestResult.ok ? "text-green-400" : "text-red-400"
                )}>
                  {smtpTestResult.ok
                    ? <CheckCircle size={13} />
                    : <AlertCircle size={13} />}
                  {smtpTestResult.message}
                </span>
              )}
            </div>

            {/* Scheduled Reports */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div>
                <label htmlFor="reportSchedule" className="text-sm font-medium text-white/80">
                  Auto-send report
                </label>
                <p className="text-xs text-white/40 mt-0.5">
                  Automatically emails an HTML report on a schedule. Requires SMTP to be configured.
                </p>
              </div>
              <select
                id="reportSchedule"
                value={reportSchedule}
                onChange={(e) => setReportSchedule(e.target.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm",
                  "bg-white/5 border border-white/10",
                  "focus:outline-none focus:ring-1 focus:ring-blue-500"
                )}
              >
                <option value="none">Off</option>
                <option value="daily">Daily at 7am</option>
                <option value="weekly">Monday at 7am</option>
              </select>
            </div>
          </div>

          {/* Notifications (Slack + Teams) */}
          <div className="rounded-xl border border-white/10 p-5 space-y-4">
            <h2 className="font-semibold text-sm text-white/60 uppercase tracking-wider">
              Notifications
            </h2>

            {/* Slack */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="slackWebhookUrl" className="text-sm font-medium text-white/80">
                  Slack Webhook URL
                </label>
                {status.slackWebhookSet && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle size={12} />
                    Configured
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  id="slackWebhookUrl"
                  type="text"
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  placeholder={status.slackWebhookSet ? "Enter new URL to replace…" : "https://hooks.slack.com/services/…"}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-sm font-mono",
                    "bg-white/5 border border-white/10",
                    "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  )}
                />
                <button
                  type="button"
                  onClick={() => handleTestWebhook("slack")}
                  disabled={testingSlack || !status.slackWebhookSet}
                  title={!status.slackWebhookSet ? "Save Slack webhook URL first" : undefined}
                  className="px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/30 disabled:opacity-40 text-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  {testingSlack && <Loader2 size={12} className="animate-spin" />}
                  {testingSlack ? "Sending…" : "Test"}
                </button>
              </div>
              {slackTestResult && (
                <span className={cn(
                  "flex items-center gap-1.5 text-xs",
                  slackTestResult.ok ? "text-green-400" : "text-red-400"
                )}>
                  {slackTestResult.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                  {slackTestResult.message}
                </span>
              )}
            </div>

            {/* Teams */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="teamsWebhookUrl" className="text-sm font-medium text-white/80">
                  Teams Webhook URL
                </label>
                {status.teamsWebhookSet && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle size={12} />
                    Configured
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  id="teamsWebhookUrl"
                  type="text"
                  value={teamsWebhookUrl}
                  onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                  placeholder={status.teamsWebhookSet ? "Enter new URL to replace…" : "https://outlook.office.com/webhook/…"}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-sm font-mono",
                    "bg-white/5 border border-white/10",
                    "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  )}
                />
                <button
                  type="button"
                  onClick={() => handleTestWebhook("teams")}
                  disabled={testingTeams || !status.teamsWebhookSet}
                  title={!status.teamsWebhookSet ? "Save Teams webhook URL first" : undefined}
                  className="px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/30 disabled:opacity-40 text-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  {testingTeams && <Loader2 size={12} className="animate-spin" />}
                  {testingTeams ? "Sending…" : "Test"}
                </button>
              </div>
              {teamsTestResult && (
                <span className={cn(
                  "flex items-center gap-1.5 text-xs",
                  teamsTestResult.ok ? "text-green-400" : "text-red-400"
                )}>
                  {teamsTestResult.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                  {teamsTestResult.message}
                </span>
              )}
            </div>
          </div>

          {/* Alerting */}
          <div className="rounded-xl border border-white/10 p-5 space-y-4">
            <h2 className="font-semibold text-sm text-white/60 uppercase tracking-wider flex items-center gap-2">
              Alerting
            </h2>

            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="alertingEnabled" className="text-sm font-medium text-white/80">
                  Enable proactive alerting
                </label>
                <p className="text-xs text-white/40 mt-0.5">
                  When enabled, SmrtNetwork polls all networks every 5 minutes and emails you if any network&apos;s health score drops below the threshold.
                </p>
              </div>
              <input
                id="alertingEnabled"
                type="checkbox"
                checked={alertingEnabled}
                onChange={(e) => setAlertingEnabled(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="alertThreshold" className="text-sm font-medium text-white/80 block">
                  Alert threshold (health score)
                </label>
                <input
                  id="alertThreshold"
                  type="number"
                  min={0}
                  max={100}
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg text-sm font-mono",
                    "bg-white/5 border border-white/10",
                    "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  )}
                />
                <p className="text-xs text-white/30">Default: 80 (0–100)</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="alertCooldownMinutes" className="text-sm font-medium text-white/80 block">
                  Alert cooldown (minutes)
                </label>
                <input
                  id="alertCooldownMinutes"
                  type="number"
                  min={1}
                  value={alertCooldownMinutes}
                  onChange={(e) => setAlertCooldownMinutes(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg text-sm font-mono",
                    "bg-white/5 border border-white/10",
                    "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  )}
                />
                <p className="text-xs text-white/30">Minimum minutes between alerts for same network. Default: 60</p>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || !hasChanges}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-400">
                <CheckCircle size={14} />
                Saved — changes are live
              </span>
            )}
            {saveError && (
              <span className="flex items-center gap-1.5 text-sm text-red-400">
                <AlertCircle size={14} />
                {saveError}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
