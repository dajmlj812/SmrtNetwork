"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle, AlertCircle, Eye, EyeOff, Loader2, Mail, LogOut, Lock,
  ShieldOff, Download, Trash2, Server,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole, useIsAdmin } from "@/lib/context/RoleContext";

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
  networkThresholds: Record<string, number>;
  slackWebhookUrl: string;
  teamsWebhookUrl: string;
  slackWebhookSet: boolean;
  teamsWebhookSet: boolean;
  reportSchedule: string;
  activeOrgId: string;
  appPasswordSet: boolean;
  readonlyPasswordSet: boolean;
  alertMutedUntil: string | null;
  sessionTimeoutDays: number;
  ldapEnabled: boolean;
  ldapUrl: string;
  ldapBaseDn: string;
  ldapBindDn: string;
  ldapBindPasswordSet: boolean;
  ldapUserFilter: string;
  ldapAdminGroup: string;
  ldapReadonlyGroup: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
}

function KeyField({
  label, fieldKey, placeholder, current, isSet, value, onChange,
}: {
  label: string; fieldKey: string; placeholder: string; current: string;
  isSet: boolean; value: string; onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={fieldKey} className="text-sm font-medium text-white/80">{label}</label>
        {isSet ? (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <CheckCircle size={12} /> Set — <span className="font-mono">{current}</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-yellow-400">
            <AlertCircle size={12} /> Not configured
          </span>
        )}
      </div>
      <div className="relative">
        <input
          id={fieldKey} type={show ? "text" : "password"} value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isSet ? "Enter new value to replace…" : placeholder}
          className={cn(
            "w-full px-3 py-2 pr-10 rounded-lg text-sm font-mono",
            "bg-white/5 border border-white/10",
            "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500"
          )}
        />
        <button type="button" onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

function TextField({
  label, fieldKey, placeholder, value, onChange, type = "text",
}: {
  label: string; fieldKey: string; placeholder: string;
  value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldKey} className="text-sm font-medium text-white/80 block">{label}</label>
      <input
        id={fieldKey} type={type} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={cn(
          "w-full px-3 py-2 rounded-lg text-sm font-mono",
          "bg-white/5 border border-white/10",
          "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500"
        )}
      />
    </div>
  );
}

function NetworkThresholdsSection({
  orgId, globalThreshold, currentThresholds, onSaved,
}: {
  orgId: string; globalThreshold: number;
  currentThresholds: Record<string, number>; onSaved: () => void;
}) {
  const isAdmin = useIsAdmin();
  const [networks, setNetworks] = useState<{ id: string; name: string }[] | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/meraki/networks?orgId=${orgId}`)
      .then((r) => r.json())
      .then((nets: { id: string; name: string }[]) => {
        setNetworks(nets);
        const init: Record<string, string> = {};
        for (const net of nets) {
          if (currentThresholds[net.id] != null) init[net.id] = String(currentThresholds[net.id]);
        }
        setOverrides(init);
      })
      .catch(() => setNetworks([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const parsed: Record<string, number> = {};
    for (const [id, val] of Object.entries(overrides)) {
      const n = Number(val);
      if (!isNaN(n) && val.trim() !== "") parsed[id] = Math.max(0, Math.min(100, n));
    }
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ networkThresholds: parsed }),
      });
      onSaved();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm text-white/60 uppercase tracking-wider">
            Per-Network Alert Thresholds
          </h2>
          <p className="text-xs text-white/30 mt-0.5">
            Override the global threshold ({globalThreshold}) for specific networks. Leave blank to use global.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle size={12} /> Saved
            </span>
          )}
          <button type="button" onClick={handleSave} disabled={saving || !networks?.length || !isAdmin}
            className="px-3 py-1.5 rounded-lg bg-[#1e9c4a] hover:bg-[#30ba67] disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-1.5">
            {saving && <Loader2 size={12} className="animate-spin" />}
            Save Thresholds
          </button>
        </div>
      </div>

      {networks === null && (
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <Loader2 size={14} className="animate-spin" /> Loading networks…
        </div>
      )}
      {networks !== null && networks.length === 0 && (
        <p className="text-sm text-white/40">No networks found.</p>
      )}
      {networks !== null && networks.length > 0 && (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {networks.map((net) => (
            <div key={net.id} className="flex items-center gap-3">
              <span className="text-sm text-white/70 flex-1 truncate" title={net.name}>{net.name}</span>
              <input
                type="number" min={0} max={100} value={overrides[net.id] ?? ""}
                onChange={(e) => setOverrides((prev) => ({ ...prev, [net.id]: e.target.value }))}
                placeholder={String(globalThreshold)}
                className={cn(
                  "w-20 px-2 py-1 rounded-lg text-sm font-mono text-right",
                  "bg-white/5 border border-white/10",
                  "placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-[#1e9c4a]"
                )}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditLogSection() {
  const isAdmin = useIsAdmin();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [clearing, setClearing] = useState(false);

  async function load() {
    const res = await fetch("/api/audit-log");
    const data = await res.json() as AuditEntry[];
    setEntries(data);
  }

  useEffect(() => { load().catch(() => setEntries([])); }, []);

  async function handleClear() {
    if (!confirm("Clear all audit log entries? This cannot be undone.")) return;
    setClearing(true);
    try {
      await fetch("/api/audit-log", { method: "DELETE" });
      setEntries([]);
    } finally {
      setClearing(false);
    }
  }

  function handleExport() {
    window.open("/api/audit-log?format=csv", "_blank");
  }

  return (
    <div className="rounded-xl border border-white/10 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm text-white/60 uppercase tracking-wider">
            Audit Log
          </h2>
          <p className="text-xs text-white/30 mt-0.5">
            Settings changes, logins, and password events (last 1,000 entries).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/30 text-sm transition-colors">
            <Download size={13} /> Export CSV
          </button>
          <button type="button" onClick={handleClear} disabled={clearing || entries?.length === 0 || !isAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 hover:border-red-500/40 hover:text-red-400 disabled:opacity-40 text-sm transition-colors">
            {clearing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Clear
          </button>
        </div>
      </div>

      {entries === null && (
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      )}
      {entries !== null && entries.length === 0 && (
        <p className="text-sm text-white/40">No audit entries yet.</p>
      )}
      {entries !== null && entries.length > 0 && (
        <div className="space-y-0 max-h-72 overflow-y-auto rounded-lg border border-white/5">
          {entries.slice(0, 100).map((e) => (
            <div key={e.id} className="flex items-start gap-3 px-3 py-2 border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
              <span className="text-[10px] font-mono text-white/30 whitespace-nowrap mt-0.5 shrink-0">
                {new Date(e.timestamp).toLocaleString()}
              </span>
              <div className="min-w-0">
                <span className="text-xs font-mono text-[#30ba67]">{e.action}</span>
                <p className="text-xs text-white/50 truncate">{e.details}</p>
              </div>
            </div>
          ))}
          {entries.length > 100 && (
            <p className="text-xs text-white/30 px-3 py-2 text-center">
              Showing 100 of {entries.length} — export CSV for full log
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const role = useRole();
  const isReadonly = role === "readonly";

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

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [smtpTo, setSmtpTo] = useState("");

  const [alertingEnabled, setAlertingEnabled] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState("80");
  const [alertCooldownMinutes, setAlertCooldownMinutes] = useState("60");

  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState("");
  const [testingSlack, setTestingSlack] = useState(false);
  const [testingTeams, setTestingTeams] = useState(false);
  const [slackTestResult, setSlackTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [teamsTestResult, setTeamsTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [reportSchedule, setReportSchedule] = useState("none");
  const [muteUntilInput, setMuteUntilInput] = useState("");
  const [savingMute, setSavingMute] = useState(false);

  // Security — admin password
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passError, setPassError] = useState<string | null>(null);
  const [passSaved, setPassSaved] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  // Security — read-only password
  const [newReadonlyPass, setNewReadonlyPass] = useState("");
  const [confirmReadonlyPass, setConfirmReadonlyPass] = useState("");
  const [readonlyPassError, setReadonlyPassError] = useState<string | null>(null);
  const [readonlyPassSaved, setReadonlyPassSaved] = useState(false);
  const [savingReadonlyPass, setSavingReadonlyPass] = useState(false);

  // Security — session timeout
  const [sessionTimeoutDays, setSessionTimeoutDays] = useState("7");

  // LDAP
  const [ldapEnabled, setLdapEnabled] = useState(false);
  const [ldapUrl, setLdapUrl] = useState("");
  const [ldapBaseDn, setLdapBaseDn] = useState("");
  const [ldapBindDn, setLdapBindDn] = useState("");
  const [ldapBindPassword, setLdapBindPassword] = useState("");
  const [ldapUserFilter, setLdapUserFilter] = useState("(sAMAccountName={{username}})");
  const [ldapAdminGroup, setLdapAdminGroup] = useState("");
  const [ldapReadonlyGroup, setLdapReadonlyGroup] = useState("");
  const [savingLdap, setSavingLdap] = useState(false);
  const [ldapSaved, setLdapSaved] = useState(false);
  const [ldapError, setLdapError] = useState<string | null>(null);

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
        setSessionTimeoutDays(String(data.sessionTimeoutDays ?? 7));
        setLdapEnabled(data.ldapEnabled ?? false);
        setLdapUrl(data.ldapUrl ?? "");
        setLdapBaseDn(data.ldapBaseDn ?? "");
        setLdapBindDn(data.ldapBindDn ?? "");
        setLdapUserFilter(data.ldapUserFilter || "(sAMAccountName={{username}})");
        setLdapAdminGroup(data.ldapAdminGroup ?? "");
        setLdapReadonlyGroup(data.ldapReadonlyGroup ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (isReadonly) return;
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
    if (sessionTimeoutDays.trim()) body.sessionTimeoutDays = Number(sessionTimeoutDays.trim());

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      const fresh = await fetch("/api/settings").then((r) => r.json()) as SettingsStatus;
      setStatus(fresh);
      setAlertingEnabled(fresh.alertingEnabled ?? false);
      setAlertThreshold(String(fresh.alertThreshold ?? 80));
      setAlertCooldownMinutes(String(fresh.alertCooldownMinutes ?? 60));
      setReportSchedule(fresh.reportSchedule ?? "none");
      setSessionTimeoutDays(String(fresh.sessionTimeoutDays ?? 7));
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
    if (channel === "slack") { setTestingSlack(true); setSlackTestResult(null); }
    else { setTestingTeams(true); setTeamsTestResult(null); }
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

  async function handleSetPassword() {
    if (!newPass) { setPassError("Password cannot be empty"); return; }
    if (newPass !== confirmPass) { setPassError("Passwords do not match"); return; }
    setSavingPass(true);
    setPassError(null);
    setPassSaved(false);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPass }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Failed to set password");
      setNewPass(""); setConfirmPass("");
      setPassSaved(true);
      setTimeout(() => setPassSaved(false), 3000);
      const fresh = await fetch("/api/settings").then((r) => r.json()) as SettingsStatus;
      setStatus(fresh);
    } catch (err) {
      setPassError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSavingPass(false);
    }
  }

  async function handleRemovePassword() {
    setSavingPass(true);
    setPassError(null);
    setPassSaved(false);
    try {
      await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: "" }),
      });
      setPassSaved(true);
      setTimeout(() => setPassSaved(false), 3000);
      const fresh = await fetch("/api/settings").then((r) => r.json()) as SettingsStatus;
      setStatus(fresh);
    } catch (err) {
      setPassError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSavingPass(false);
    }
  }

  async function handleSetReadonlyPassword() {
    if (!newReadonlyPass) { setReadonlyPassError("Password cannot be empty"); return; }
    if (newReadonlyPass !== confirmReadonlyPass) { setReadonlyPassError("Passwords do not match"); return; }
    setSavingReadonlyPass(true);
    setReadonlyPassError(null);
    setReadonlyPassSaved(false);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newReadonlyPassword: newReadonlyPass }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Failed");
      setNewReadonlyPass(""); setConfirmReadonlyPass("");
      setReadonlyPassSaved(true);
      setTimeout(() => setReadonlyPassSaved(false), 3000);
      const fresh = await fetch("/api/settings").then((r) => r.json()) as SettingsStatus;
      setStatus(fresh);
    } catch (err) {
      setReadonlyPassError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSavingReadonlyPass(false);
    }
  }

  async function handleRemoveReadonlyPassword() {
    setSavingReadonlyPass(true);
    setReadonlyPassError(null);
    try {
      await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeReadonly: true }),
      });
      setReadonlyPassSaved(true);
      setTimeout(() => setReadonlyPassSaved(false), 3000);
      const fresh = await fetch("/api/settings").then((r) => r.json()) as SettingsStatus;
      setStatus(fresh);
    } catch (err) {
      setReadonlyPassError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSavingReadonlyPass(false);
    }
  }

  async function handleSaveLdap() {
    setSavingLdap(true);
    setLdapSaved(false);
    setLdapError(null);
    try {
      const body: Record<string, unknown> = {
        ldapEnabled,
        ldapUrl: ldapUrl.trim(),
        ldapBaseDn: ldapBaseDn.trim(),
        ldapBindDn: ldapBindDn.trim(),
        ldapUserFilter: ldapUserFilter.trim() || "(sAMAccountName={{username}})",
        ldapAdminGroup: ldapAdminGroup.trim(),
        ldapReadonlyGroup: ldapReadonlyGroup.trim(),
      };
      if (ldapBindPassword.trim()) body.ldapBindPassword = ldapBindPassword.trim();
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setLdapBindPassword("");
      setLdapSaved(true);
      setTimeout(() => setLdapSaved(false), 3000);
      const fresh = await fetch("/api/settings").then((r) => r.json()) as SettingsStatus;
      setStatus(fresh);
    } catch (err) {
      setLdapError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSavingLdap(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const hasChanges =
    !!merakiKey || !!anthropicKey || !!smtpUser || !!smtpPass ||
    !!slackWebhookUrl || !!teamsWebhookUrl ||
    (status && merakiBaseUrl !== status.merakiBaseUrl) ||
    (status && smtpHost !== (status.smtpHost ?? "")) ||
    (status && smtpPort !== String(status.smtpPort ?? 587)) ||
    (status && smtpFrom !== (status.smtpFrom ?? "")) ||
    (status && smtpTo !== (status.smtpTo ?? "")) ||
    (status && alertingEnabled !== (status.alertingEnabled ?? false)) ||
    (status && alertThreshold !== String(status.alertThreshold ?? 80)) ||
    (status && alertCooldownMinutes !== String(status.alertCooldownMinutes ?? 60)) ||
    (status && reportSchedule !== (status.reportSchedule ?? "none")) ||
    (status && sessionTimeoutDays !== String(status.sessionTimeoutDays ?? 7));

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-start justify-between gap-4">
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
        <button type="button" onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mt-1"
          title="Sign out">
          <LogOut size={13} /> Sign Out
        </button>
      </div>

      {/* Read-only banner */}
      {isReadonly && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-center gap-3">
          <ShieldOff size={16} className="text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-300">
            You&apos;re signed in as <strong>read-only</strong>. Settings changes are disabled.
          </p>
        </div>
      )}

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
            <h2 className="font-semibold text-sm text-white/60 uppercase tracking-wider">Cisco Meraki</h2>
            <KeyField label="API Key" fieldKey="merakiApiKey" placeholder="40-character hex key from Meraki Dashboard"
              current={status.merakiApiKeyMasked} isSet={status.merakiApiKeySet}
              value={merakiKey} onChange={setMerakiKey} />
            <div className="space-y-1.5">
              <label htmlFor="merakiBaseUrl" className="text-sm font-medium text-white/80">Base URL</label>
              <input id="merakiBaseUrl" type="text" value={merakiBaseUrl}
                onChange={(e) => setMerakiBaseUrl(e.target.value)}
                className={cn("w-full px-3 py-2 rounded-lg text-sm font-mono",
                  "bg-white/5 border border-white/10",
                  "focus:outline-none focus:ring-1 focus:ring-blue-500")} />
              <p className="text-xs text-white/30">Change only if using a Meraki Government or private cloud instance.</p>
            </div>
          </div>

          {/* Anthropic */}
          <div className="rounded-xl border border-white/10 p-5 space-y-4">
            <h2 className="font-semibold text-sm text-white/60 uppercase tracking-wider">Anthropic / Claude</h2>
            <KeyField label="API Key" fieldKey="anthropicApiKey" placeholder="sk-ant-api03-…"
              current={status.anthropicApiKeyMasked} isSet={status.anthropicApiKeySet}
              value={anthropicKey} onChange={setAnthropicKey} />
          </div>

          {/* SMTP / Email Reports */}
          <div className="rounded-xl border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-white/60 uppercase tracking-wider flex items-center gap-2">
                <Mail size={14} /> Email Reports
              </h2>
              {status.smtpConfigured ? (
                <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={12} /> SMTP configured</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-white/30"><AlertCircle size={12} /> Not configured</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="SMTP Host" fieldKey="smtpHost" placeholder="smtp.example.com" value={smtpHost} onChange={setSmtpHost} />
              <TextField label="Port" fieldKey="smtpPort" placeholder="587" value={smtpPort} onChange={setSmtpPort} type="number" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="smtpUser" className="text-sm font-medium text-white/80 block">Username</label>
              <input id="smtpUser" type="text" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)}
                placeholder={status.smtpConfigured ? "Enter new value to replace…" : "user@example.com"}
                className={cn("w-full px-3 py-2 rounded-lg text-sm font-mono", "bg-white/5 border border-white/10",
                  "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500")} />
            </div>
            <KeyField label="Password" fieldKey="smtpPass" placeholder="SMTP password or app password"
              current="" isSet={status.smtpConfigured} value={smtpPass} onChange={setSmtpPass} />
            <div className="grid grid-cols-2 gap-4">
              <TextField label="From Address" fieldKey="smtpFrom" placeholder="reports@example.com" value={smtpFrom} onChange={setSmtpFrom} />
              <div className="space-y-1.5">
                <label htmlFor="smtpTo" className="text-sm font-medium text-white/80 block">To Address</label>
                <input id="smtpTo" type="text" value={smtpTo} onChange={(e) => setSmtpTo(e.target.value)}
                  placeholder="recipient@company.com, ops@company.com"
                  className={cn("w-full px-3 py-2 rounded-lg text-sm font-mono", "bg-white/5 border border-white/10",
                    "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                <p className="text-xs text-white/40 mt-1">Separate multiple addresses with commas</p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button type="button" onClick={handleTestSmtp} disabled={testingSmtp || !status.smtpConfigured}
                title={!status.smtpConfigured ? "Save SMTP credentials first" : undefined}
                className="px-4 py-1.5 rounded-lg border border-white/15 hover:border-white/30 disabled:opacity-40 text-sm transition-colors flex items-center gap-2">
                {testingSmtp && <Loader2 size={13} className="animate-spin" />}
                <Mail size={13} />
                {testingSmtp ? "Sending…" : "Send Test Email"}
              </button>
              {smtpTestResult && (
                <span className={cn("flex items-center gap-1.5 text-sm",
                  smtpTestResult.ok ? "text-green-400" : "text-red-400")}>
                  {smtpTestResult.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                  {smtpTestResult.message}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div>
                <label htmlFor="reportSchedule" className="text-sm font-medium text-white/80">Auto-send report</label>
                <p className="text-xs text-white/40 mt-0.5">Automatically emails an HTML report on a schedule. Requires SMTP.</p>
              </div>
              <select id="reportSchedule" value={reportSchedule} onChange={(e) => setReportSchedule(e.target.value)}
                className={cn("px-3 py-1.5 rounded-lg text-sm", "bg-white/5 border border-white/10",
                  "focus:outline-none focus:ring-1 focus:ring-blue-500")}>
                <option value="none">Off</option>
                <option value="daily">Daily at 7am</option>
                <option value="weekly">Monday at 7am</option>
              </select>
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-xl border border-white/10 p-5 space-y-4">
            <h2 className="font-semibold text-sm text-white/60 uppercase tracking-wider">Notifications</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="slackWebhookUrl" className="text-sm font-medium text-white/80">Slack Webhook URL</label>
                {status.slackWebhookSet && (
                  <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={12} /> Configured</span>
                )}
              </div>
              <div className="flex gap-2">
                <input id="slackWebhookUrl" type="text" value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  placeholder={status.slackWebhookSet ? "Enter new URL to replace…" : "https://hooks.slack.com/services/…"}
                  className={cn("flex-1 px-3 py-2 rounded-lg text-sm font-mono", "bg-white/5 border border-white/10",
                    "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                <button type="button" onClick={() => handleTestWebhook("slack")}
                  disabled={testingSlack || !status.slackWebhookSet}
                  title={!status.slackWebhookSet ? "Save Slack webhook URL first" : undefined}
                  className="px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/30 disabled:opacity-40 text-sm transition-colors flex items-center gap-1.5 whitespace-nowrap">
                  {testingSlack && <Loader2 size={12} className="animate-spin" />}
                  {testingSlack ? "Sending…" : "Test"}
                </button>
              </div>
              {slackTestResult && (
                <span className={cn("flex items-center gap-1.5 text-xs",
                  slackTestResult.ok ? "text-green-400" : "text-red-400")}>
                  {slackTestResult.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                  {slackTestResult.message}
                </span>
              )}
              <p className="text-xs text-white/30">Separate multiple webhook URLs with commas to send to multiple Slack channels</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="teamsWebhookUrl" className="text-sm font-medium text-white/80">Teams Webhook URL</label>
                {status.teamsWebhookSet && (
                  <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={12} /> Configured</span>
                )}
              </div>
              <div className="flex gap-2">
                <input id="teamsWebhookUrl" type="text" value={teamsWebhookUrl}
                  onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                  placeholder={status.teamsWebhookSet ? "Enter new URL to replace…" : "https://outlook.office.com/webhook/…"}
                  className={cn("flex-1 px-3 py-2 rounded-lg text-sm font-mono", "bg-white/5 border border-white/10",
                    "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                <button type="button" onClick={() => handleTestWebhook("teams")}
                  disabled={testingTeams || !status.teamsWebhookSet}
                  title={!status.teamsWebhookSet ? "Save Teams webhook URL first" : undefined}
                  className="px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/30 disabled:opacity-40 text-sm transition-colors flex items-center gap-1.5 whitespace-nowrap">
                  {testingTeams && <Loader2 size={12} className="animate-spin" />}
                  {testingTeams ? "Sending…" : "Test"}
                </button>
              </div>
              {teamsTestResult && (
                <span className={cn("flex items-center gap-1.5 text-xs",
                  teamsTestResult.ok ? "text-green-400" : "text-red-400")}>
                  {teamsTestResult.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                  {teamsTestResult.message}
                </span>
              )}
              <p className="text-xs text-white/30">Separate multiple webhook URLs with commas to send to multiple Teams channels</p>
            </div>
          </div>

          {/* Alerting */}
          <div className="rounded-xl border border-white/10 p-5 space-y-4">
            <h2 className="font-semibold text-sm text-white/60 uppercase tracking-wider flex items-center gap-2">Alerting</h2>
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="alertingEnabled" className="text-sm font-medium text-white/80">Enable proactive alerting</label>
                <p className="text-xs text-white/40 mt-0.5">
                  Polls all networks every 5 min and alerts if health drops below threshold.
                </p>
              </div>
              <input id="alertingEnabled" type="checkbox" checked={alertingEnabled}
                onChange={(e) => setAlertingEnabled(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-500 cursor-pointer" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="alertThreshold" className="text-sm font-medium text-white/80 block">Alert threshold (health score)</label>
                <input id="alertThreshold" type="number" min={0} max={100} value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  className={cn("w-full px-3 py-2 rounded-lg text-sm font-mono", "bg-white/5 border border-white/10",
                    "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                <p className="text-xs text-white/30">Default: 80 (0–100)</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="alertCooldownMinutes" className="text-sm font-medium text-white/80 block">Alert cooldown (minutes)</label>
                <input id="alertCooldownMinutes" type="number" min={1} value={alertCooldownMinutes}
                  onChange={(e) => setAlertCooldownMinutes(e.target.value)}
                  className={cn("w-full px-3 py-2 rounded-lg text-sm font-mono", "bg-white/5 border border-white/10",
                    "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                <p className="text-xs text-white/30">Min minutes between alerts for same network. Default: 60</p>
              </div>
            </div>
            <div className="pt-2 border-t border-white/10 space-y-3">
              <label className="text-sm font-medium text-white/80">Mute Alerts</label>
              {status.alertMutedUntil && new Date(status.alertMutedUntil) > new Date() ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-yellow-400">Muted until {new Date(status.alertMutedUntil).toLocaleString()}</span>
                  <button type="button" disabled={savingMute}
                    onClick={async () => {
                      setSavingMute(true);
                      try {
                        await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ alertMutedUntil: "" }) });
                        const fresh = await fetch("/api/settings").then((r) => r.json()) as SettingsStatus;
                        setStatus(fresh);
                      } finally { setSavingMute(false); }
                    }}
                    className="px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/30 disabled:opacity-40 text-sm transition-colors">
                    Clear Mute
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input type="datetime-local" value={muteUntilInput} onChange={(e) => setMuteUntilInput(e.target.value)}
                    className={cn("px-3 py-2 rounded-lg text-sm font-mono", "bg-white/5 border border-white/10",
                      "focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                  <button type="button" disabled={savingMute || !muteUntilInput}
                    onClick={async () => {
                      if (!muteUntilInput) return;
                      setSavingMute(true);
                      try {
                        await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ alertMutedUntil: new Date(muteUntilInput).toISOString() }) });
                        const fresh = await fetch("/api/settings").then((r) => r.json()) as SettingsStatus;
                        setStatus(fresh);
                        setMuteUntilInput("");
                      } finally { setSavingMute(false); }
                    }}
                    className="px-4 py-2 rounded-lg bg-[#1e9c4a] hover:bg-[#30ba67] disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-2">
                    {savingMute && <Loader2 size={13} className="animate-spin" />}
                    Mute Alerts
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Per-Network Alert Thresholds */}
          <NetworkThresholdsSection
            orgId={status.activeOrgId}
            globalThreshold={Number(alertThreshold) || 80}
            currentThresholds={status.networkThresholds ?? {}}
            onSaved={() => {
              fetch("/api/settings").then((r) => r.json()).then((d: SettingsStatus) => setStatus(d)).catch(() => {});
            }}
          />

          {/* Security */}
          <div className="rounded-xl border border-white/10 p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-white/60 uppercase tracking-wider flex items-center gap-2">
                <Lock size={14} /> Security
              </h2>
              {status.appPasswordSet ? (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle size={12} /> Password protection: Enabled
                </span>
              ) : (
                <span className="text-xs text-white/30">Not set — app is open</span>
              )}
            </div>

            {/* Session timeout */}
            <div className="space-y-1.5">
              <label htmlFor="sessionTimeoutDays" className="text-sm font-medium text-white/80 block">
                Session timeout (days)
              </label>
              <input id="sessionTimeoutDays" type="number" min={1} max={365} value={sessionTimeoutDays}
                onChange={(e) => setSessionTimeoutDays(e.target.value)}
                className={cn("w-28 px-3 py-2 rounded-lg text-sm font-mono", "bg-white/5 border border-white/10",
                  "focus:outline-none focus:ring-1 focus:ring-blue-500")} />
              <p className="text-xs text-white/30">How long sign-in sessions last before requiring re-authentication. Default: 7 days.</p>
            </div>

            {/* Admin password */}
            <div className="pt-3 border-t border-white/10 space-y-3">
              <p className="text-xs text-white/40">
                Set a password to protect access to SmrtNetwork. Leave blank to disable.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="newPass" className="text-sm font-medium text-white/80 block">New admin password</label>
                  <input id="newPass" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)}
                    placeholder="New password…"
                    className={cn("w-full px-3 py-2 rounded-lg text-sm", "bg-white/5 border border-white/10",
                      "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="confirmPass" className="text-sm font-medium text-white/80 block">Confirm</label>
                  <input id="confirmPass" type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Confirm password…"
                    className={cn("w-full px-3 py-2 rounded-lg text-sm", "bg-white/5 border border-white/10",
                      "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleSetPassword} disabled={savingPass || isReadonly}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-2">
                  {savingPass && <Loader2 size={13} className="animate-spin" />}
                  Set Password
                </button>
                {status.appPasswordSet && (
                  <button type="button" onClick={handleRemovePassword} disabled={savingPass || isReadonly}
                    className="px-4 py-1.5 rounded-lg border border-white/15 hover:border-red-500/40 hover:text-red-400 disabled:opacity-40 text-sm transition-colors">
                    Remove Password
                  </button>
                )}
                {passSaved && (
                  <span className="flex items-center gap-1.5 text-sm text-green-400">
                    <CheckCircle size={13} /> Saved
                  </span>
                )}
                {passError && (
                  <span className="flex items-center gap-1.5 text-sm text-red-400">
                    <AlertCircle size={13} /> {passError}
                  </span>
                )}
              </div>
            </div>

            {/* Read-only password */}
            <div className="pt-3 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/80">Read-only password</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    Users signing in with this password can view everything but cannot change settings.
                  </p>
                </div>
                {status.readonlyPasswordSet && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle size={12} /> Set
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="newReadonlyPass" className="text-sm font-medium text-white/80 block">New read-only password</label>
                  <input id="newReadonlyPass" type="password" value={newReadonlyPass}
                    onChange={(e) => setNewReadonlyPass(e.target.value)} placeholder="Read-only password…"
                    className={cn("w-full px-3 py-2 rounded-lg text-sm", "bg-white/5 border border-white/10",
                      "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="confirmReadonlyPass" className="text-sm font-medium text-white/80 block">Confirm</label>
                  <input id="confirmReadonlyPass" type="password" value={confirmReadonlyPass}
                    onChange={(e) => setConfirmReadonlyPass(e.target.value)} placeholder="Confirm…"
                    className={cn("w-full px-3 py-2 rounded-lg text-sm", "bg-white/5 border border-white/10",
                      "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleSetReadonlyPassword} disabled={savingReadonlyPass || isReadonly}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-2">
                  {savingReadonlyPass && <Loader2 size={13} className="animate-spin" />}
                  Set Read-only Password
                </button>
                {status.readonlyPasswordSet && (
                  <button type="button" onClick={handleRemoveReadonlyPassword} disabled={savingReadonlyPass || isReadonly}
                    className="px-4 py-1.5 rounded-lg border border-white/15 hover:border-red-500/40 hover:text-red-400 disabled:opacity-40 text-sm transition-colors">
                    Remove
                  </button>
                )}
                {readonlyPassSaved && (
                  <span className="flex items-center gap-1.5 text-sm text-green-400">
                    <CheckCircle size={13} /> Saved
                  </span>
                )}
                {readonlyPassError && (
                  <span className="flex items-center gap-1.5 text-sm text-red-400">
                    <AlertCircle size={13} /> {readonlyPassError}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* LDAP / Active Directory */}
          <div className="rounded-xl border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-white/60 uppercase tracking-wider flex items-center gap-2">
                <Server size={14} /> LDAP / Active Directory
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={ldapEnabled} onChange={(e) => setLdapEnabled(e.target.checked)}
                  disabled={isReadonly}
                  className="w-4 h-4 rounded accent-[#1e9c4a] cursor-pointer" />
                <span className="text-xs text-white/60">Enable LDAP</span>
              </label>
            </div>

            {ldapEnabled && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="LDAP URL" fieldKey="ldapUrl" placeholder="ldap://dc.example.com"
                    value={ldapUrl} onChange={setLdapUrl} />
                  <TextField label="Base DN" fieldKey="ldapBaseDn" placeholder="DC=example,DC=com"
                    value={ldapBaseDn} onChange={setLdapBaseDn} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="Service Account DN (optional)" fieldKey="ldapBindDn"
                    placeholder="CN=svc-account,DC=example,DC=com"
                    value={ldapBindDn} onChange={setLdapBindDn} />
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-white/80 block">
                      Service Account Password
                      {status.ldapBindPasswordSet && (
                        <span className="ml-2 text-xs text-green-400 font-normal">set</span>
                      )}
                    </label>
                    <input type="password" value={ldapBindPassword} onChange={(e) => setLdapBindPassword(e.target.value)}
                      placeholder={status.ldapBindPasswordSet ? "Enter new value to replace…" : "Service account password…"}
                      className={cn("w-full px-3 py-2 rounded-lg text-sm font-mono", "bg-white/5 border border-white/10",
                        "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                  </div>
                </div>
                <TextField label="User filter" fieldKey="ldapUserFilter"
                  placeholder="(sAMAccountName={{username}})"
                  value={ldapUserFilter} onChange={setLdapUserFilter} />
                <p className="text-xs text-white/30">
                  Use <span className="font-mono">{"{{username}}"}</span> as a placeholder for the entered username.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="Admin group DN (optional)" fieldKey="ldapAdminGroup"
                    placeholder="CN=SmrtNetwork-Admin,DC=example,DC=com"
                    value={ldapAdminGroup} onChange={setLdapAdminGroup} />
                  <TextField label="Read-only group DN (optional)" fieldKey="ldapReadonlyGroup"
                    placeholder="CN=SmrtNetwork-ReadOnly,DC=example,DC=com"
                    value={ldapReadonlyGroup} onChange={setLdapReadonlyGroup} />
                </div>
                <p className="text-xs text-white/30">
                  If no groups are set, any valid directory user gets admin access. If only the admin group is set, users outside it are denied.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button type="button" onClick={handleSaveLdap} disabled={savingLdap || isReadonly}
                className="px-4 py-1.5 rounded-lg bg-[#1e9c4a] hover:bg-[#30ba67] disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-2">
                {savingLdap && <Loader2 size={13} className="animate-spin" />}
                Save LDAP Settings
              </button>
              {ldapSaved && (
                <span className="flex items-center gap-1.5 text-sm text-green-400">
                  <CheckCircle size={13} /> Saved
                </span>
              )}
              {ldapError && (
                <span className="flex items-center gap-1.5 text-sm text-red-400">
                  <AlertCircle size={13} /> {ldapError}
                </span>
              )}
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving || !hasChanges || isReadonly}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-400">
                <CheckCircle size={14} /> Saved — changes are live
              </span>
            )}
            {saveError && (
              <span className="flex items-center gap-1.5 text-sm text-red-400">
                <AlertCircle size={14} /> {saveError}
              </span>
            )}
          </div>
        </form>
      )}

      {/* Audit Log — always visible, even for read-only */}
      {!loading && <AuditLogSection />}
    </div>
  );
}
