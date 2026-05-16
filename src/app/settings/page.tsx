"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle, AlertCircle, Eye, EyeOff, Loader2, Mail, LogOut, Lock,
  ShieldOff, Download, Trash2, Server, Database, Link2,
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
  healthSummarySchedule: string;
  healthSummaryTo: string;
  networkReportRecipients: Record<string, string>;
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
  // Integrations
  serviceNowEnabled: boolean;
  serviceNowInstanceUrl: string;
  serviceNowUsername: string;
  serviceNowPasswordSet: boolean;
  serviceNowAssignmentGroup: string;
  serviceNowCategory: string;
  serviceNowCmdbCi: string;
  jiraEnabled: boolean;
  jiraUrl: string;
  jiraEmail: string;
  jiraApiTokenSet: boolean;
  jiraProjectKey: string;
  jiraIssueType: string;
  influxDbEnabled: boolean;
  influxDbUrl: string;
  influxDbMode: "v1" | "v2";
  influxDbOrg: string;
  influxDbBucket: string;
  influxDbTokenSet: boolean;
  influxDbDatabase: string;
  influxDbUsername: string;
  influxDbPasswordSet: boolean;
  healthWebhookUrls: string;
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
        <label htmlFor={fieldKey} className="text-sm font-medium text-foreground">{label}</label>
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
            "bg-overlay border",
            "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500"
          )}
        />
        <button type="button" onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-foreground-muted">
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
      <label htmlFor={fieldKey} className="text-sm font-medium text-foreground block">{label}</label>
      <input
        id={fieldKey} type={type} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={cn(
          "w-full px-3 py-2 rounded-lg text-sm font-mono",
          "bg-overlay border",
          "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500"
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
    <div className="rounded-xl border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm text-foreground-muted uppercase tracking-wider">
            Per-Network Alert Thresholds
          </h2>
          <p className="text-xs text-faint mt-0.5">
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
            className="px-3 py-1.5 rounded-lg bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-1.5">
            {saving && <Loader2 size={12} className="animate-spin" />}
            Save Thresholds
          </button>
        </div>
      </div>

      {networks === null && (
        <div className="flex items-center gap-2 text-muted text-sm">
          <Loader2 size={14} className="animate-spin" /> Loading networks…
        </div>
      )}
      {networks !== null && networks.length === 0 && (
        <p className="text-sm text-muted">No networks found.</p>
      )}
      {networks !== null && networks.length > 0 && (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {networks.map((net) => (
            <div key={net.id} className="flex items-center gap-3">
              <span className="text-sm text-foreground-muted flex-1 truncate" title={net.name}>{net.name}</span>
              <input
                type="number" min={0} max={100} value={overrides[net.id] ?? ""}
                onChange={(e) => setOverrides((prev) => ({ ...prev, [net.id]: e.target.value }))}
                placeholder={String(globalThreshold)}
                className={cn(
                  "w-20 px-2 py-1 rounded-lg text-sm font-mono text-right",
                  "bg-overlay border",
                  "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent/40"
                )}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NetworkReportRecipientsSection({
  orgId, currentRecipients, onSaved,
}: {
  orgId: string; currentRecipients: Record<string, string>; onSaved: () => void;
}) {
  const isAdmin = useIsAdmin();
  const [networks, setNetworks] = useState<{ id: string; name: string }[] | null>(null);
  const [recipients, setRecipients] = useState<Record<string, string>>({});
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
          if (currentRecipients[net.id]) init[net.id] = currentRecipients[net.id];
        }
        setRecipients(init);
      })
      .catch(() => setNetworks([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ networkReportRecipients: recipients }),
      });
      onSaved();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm text-foreground-muted uppercase tracking-wider">
            Per-Network Report Recipients
          </h2>
          <p className="text-xs text-faint mt-0.5">
            Override the global report recipient for specific networks. Leave blank to use global.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle size={12} /> Saved
            </span>
          )}
          <button type="button" onClick={handleSave} disabled={saving || !networks?.length || !isAdmin}
            className="px-3 py-1.5 rounded-lg bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-1.5">
            {saving && <Loader2 size={12} className="animate-spin" />}
            Save Recipients
          </button>
        </div>
      </div>

      {networks === null && (
        <div className="flex items-center gap-2 text-muted text-sm">
          <Loader2 size={14} className="animate-spin" /> Loading networks…
        </div>
      )}
      {networks !== null && networks.length === 0 && (
        <p className="text-sm text-muted">No networks found.</p>
      )}
      {networks !== null && networks.length > 0 && (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {networks.map((net) => (
            <div key={net.id} className="flex items-center gap-3">
              <span className="text-sm text-foreground-muted w-40 shrink-0 truncate" title={net.name}>{net.name}</span>
              <input
                type="email"
                value={recipients[net.id] ?? ""}
                onChange={(e) => setRecipients((prev) => ({ ...prev, [net.id]: e.target.value }))}
                placeholder="network@example.com"
                disabled={!isAdmin}
                className={cn(
                  "flex-1 px-2 py-1 rounded-lg text-sm",
                  "bg-overlay border",
                  "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent/40"
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
    <div className="rounded-xl border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm text-foreground-muted uppercase tracking-wider">
            Audit Log
          </h2>
          <p className="text-xs text-faint mt-0.5">
            Settings changes, logins, and password events (last 1,000 entries).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-strong hover:border-strong text-sm transition-colors">
            <Download size={13} /> Export CSV
          </button>
          <button type="button" onClick={handleClear} disabled={clearing || entries?.length === 0 || !isAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-strong hover:border-red-500/40 hover:text-red-400 disabled:opacity-40 text-sm transition-colors">
            {clearing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Clear
          </button>
        </div>
      </div>

      {entries === null && (
        <div className="flex items-center gap-2 text-muted text-sm">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      )}
      {entries !== null && entries.length === 0 && (
        <p className="text-sm text-muted">No audit entries yet.</p>
      )}
      {entries !== null && entries.length > 0 && (
        <div className="space-y-0 max-h-72 overflow-y-auto rounded-lg border">
          {entries.slice(0, 100).map((e) => (
            <div key={e.id} className="flex items-start gap-3 px-3 py-2 border-b last:border-0 hover:bg-overlay">
              <span className="text-[10px] font-mono text-faint whitespace-nowrap mt-0.5 shrink-0">
                {new Date(e.timestamp).toLocaleString()}
              </span>
              <div className="min-w-0">
                <span className="text-xs font-mono text-accent">{e.action}</span>
                <p className="text-xs text-muted truncate">{e.details}</p>
              </div>
            </div>
          ))}
          {entries.length > 100 && (
            <p className="text-xs text-faint px-3 py-2 text-center">
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
  const [healthSummarySchedule, setHealthSummarySchedule] = useState("none");
  const [healthSummaryTo, setHealthSummaryTo] = useState("");
  const [networkReportRecipients, setNetworkReportRecipients] = useState<Record<string, string>>({});
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

  // ServiceNow
  const [serviceNowEnabled, setServiceNowEnabled] = useState(false);
  const [serviceNowInstanceUrl, setServiceNowInstanceUrl] = useState("");
  const [serviceNowUsername, setServiceNowUsername] = useState("");
  const [serviceNowPassword, setServiceNowPassword] = useState("");
  const [serviceNowAssignmentGroup, setServiceNowAssignmentGroup] = useState("");
  const [serviceNowCategory, setServiceNowCategory] = useState("");
  const [serviceNowCmdbCi, setServiceNowCmdbCi] = useState("");
  const [savingServiceNow, setSavingServiceNow] = useState(false);
  const [serviceNowSaved, setServiceNowSaved] = useState(false);
  const [serviceNowError, setServiceNowError] = useState<string | null>(null);
  const [testingServiceNow, setTestingServiceNow] = useState(false);
  const [serviceNowTestResult, setServiceNowTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Jira
  const [jiraEnabled, setJiraEnabled] = useState(false);
  const [jiraUrl, setJiraUrl] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraApiToken, setJiraApiToken] = useState("");
  const [jiraProjectKey, setJiraProjectKey] = useState("");
  const [jiraIssueType, setJiraIssueType] = useState("Bug");
  const [savingJira, setSavingJira] = useState(false);
  const [jiraSaved, setJiraSaved] = useState(false);
  const [jiraError, setJiraError] = useState<string | null>(null);
  const [testingJira, setTestingJira] = useState(false);
  const [jiraTestResult, setJiraTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // InfluxDB
  const [influxDbEnabled, setInfluxDbEnabled] = useState(false);
  const [influxDbUrl, setInfluxDbUrl] = useState("");
  const [influxDbMode, setInfluxDbMode] = useState<"v1" | "v2">("v2");
  const [influxDbOrg, setInfluxDbOrg] = useState("");
  const [influxDbBucket, setInfluxDbBucket] = useState("");
  const [influxDbToken, setInfluxDbToken] = useState("");
  const [influxDbDatabase, setInfluxDbDatabase] = useState("");
  const [influxDbUsername, setInfluxDbUsername] = useState("");
  const [influxDbPassword, setInfluxDbPassword] = useState("");
  const [savingInfluxDb, setSavingInfluxDb] = useState(false);
  const [influxDbSaved, setInfluxDbSaved] = useState(false);
  const [influxDbError, setInfluxDbError] = useState<string | null>(null);
  const [testingInfluxDb, setTestingInfluxDb] = useState(false);
  const [influxDbTestResult, setInfluxDbTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Health webhook
  const [healthWebhookUrls, setHealthWebhookUrls] = useState("");
  const [savingHealthWebhook, setSavingHealthWebhook] = useState(false);
  const [healthWebhookSaved, setHealthWebhookSaved] = useState(false);

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
        setHealthSummarySchedule(data.healthSummarySchedule ?? "none");
        setHealthSummaryTo(data.healthSummaryTo ?? "");
        setNetworkReportRecipients(data.networkReportRecipients ?? {});
        setSessionTimeoutDays(String(data.sessionTimeoutDays ?? 7));
        setLdapEnabled(data.ldapEnabled ?? false);
        setLdapUrl(data.ldapUrl ?? "");
        setLdapBaseDn(data.ldapBaseDn ?? "");
        setLdapBindDn(data.ldapBindDn ?? "");
        setLdapUserFilter(data.ldapUserFilter || "(sAMAccountName={{username}})");
        setLdapAdminGroup(data.ldapAdminGroup ?? "");
        setLdapReadonlyGroup(data.ldapReadonlyGroup ?? "");
        // Integrations
        setServiceNowEnabled(data.serviceNowEnabled ?? false);
        setServiceNowInstanceUrl(data.serviceNowInstanceUrl ?? "");
        setServiceNowUsername(data.serviceNowUsername ?? "");
        setServiceNowAssignmentGroup(data.serviceNowAssignmentGroup ?? "");
        setServiceNowCategory(data.serviceNowCategory ?? "");
        setServiceNowCmdbCi(data.serviceNowCmdbCi ?? "");
        setJiraEnabled(data.jiraEnabled ?? false);
        setJiraUrl(data.jiraUrl ?? "");
        setJiraEmail(data.jiraEmail ?? "");
        setJiraProjectKey(data.jiraProjectKey ?? "");
        setJiraIssueType(data.jiraIssueType || "Bug");
        setInfluxDbEnabled(data.influxDbEnabled ?? false);
        setInfluxDbUrl(data.influxDbUrl ?? "");
        setInfluxDbMode(data.influxDbMode ?? "v2");
        setInfluxDbOrg(data.influxDbOrg ?? "");
        setInfluxDbBucket(data.influxDbBucket ?? "");
        setInfluxDbDatabase(data.influxDbDatabase ?? "");
        setInfluxDbUsername(data.influxDbUsername ?? "");
        setHealthWebhookUrls(data.healthWebhookUrls ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (isReadonly) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);

    const body: Record<string, string | number | boolean | Record<string, string>> = {};
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
    body.healthSummarySchedule = healthSummarySchedule;
    if (healthSummaryTo.trim()) body.healthSummaryTo = healthSummaryTo.trim();
    if (Object.keys(networkReportRecipients).length > 0)
      body.networkReportRecipients = networkReportRecipients;
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
      setHealthSummarySchedule(fresh.healthSummarySchedule ?? "none");
      setHealthSummaryTo(fresh.healthSummaryTo ?? "");
      setNetworkReportRecipients(fresh.networkReportRecipients ?? {});
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

  async function handleSaveServiceNow() {
    setSavingServiceNow(true);
    setServiceNowSaved(false);
    setServiceNowError(null);
    try {
      const body: Record<string, unknown> = {
        serviceNowEnabled,
        serviceNowInstanceUrl: serviceNowInstanceUrl.trim(),
        serviceNowUsername: serviceNowUsername.trim(),
        serviceNowAssignmentGroup: serviceNowAssignmentGroup.trim(),
        serviceNowCategory: serviceNowCategory.trim(),
        serviceNowCmdbCi: serviceNowCmdbCi.trim(),
      };
      if (serviceNowPassword.trim()) body.serviceNowPassword = serviceNowPassword.trim();
      await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setServiceNowPassword("");
      setServiceNowSaved(true);
      setTimeout(() => setServiceNowSaved(false), 3000);
      const fresh = await fetch("/api/settings").then((r) => r.json()) as SettingsStatus;
      setStatus(fresh);
    } catch (err) {
      setServiceNowError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSavingServiceNow(false);
    }
  }

  async function handleTestServiceNow() {
    setTestingServiceNow(true);
    setServiceNowTestResult(null);
    try {
      const res = await fetch("/api/integrations/servicenow/test", { method: "POST" });
      const data = await res.json() as { success?: boolean; error?: string };
      setServiceNowTestResult({ ok: !!data.success, message: data.success ? "Connection successful" : (data.error ?? "Test failed") });
    } catch (err) {
      setServiceNowTestResult({ ok: false, message: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setTestingServiceNow(false);
    }
  }

  async function handleSaveJira() {
    setSavingJira(true);
    setJiraSaved(false);
    setJiraError(null);
    try {
      const body: Record<string, unknown> = {
        jiraEnabled,
        jiraUrl: jiraUrl.trim(),
        jiraEmail: jiraEmail.trim(),
        jiraProjectKey: jiraProjectKey.trim(),
        jiraIssueType: jiraIssueType.trim() || "Bug",
      };
      if (jiraApiToken.trim()) body.jiraApiToken = jiraApiToken.trim();
      await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setJiraApiToken("");
      setJiraSaved(true);
      setTimeout(() => setJiraSaved(false), 3000);
      const fresh = await fetch("/api/settings").then((r) => r.json()) as SettingsStatus;
      setStatus(fresh);
    } catch (err) {
      setJiraError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSavingJira(false);
    }
  }

  async function handleTestJira() {
    setTestingJira(true);
    setJiraTestResult(null);
    try {
      const res = await fetch("/api/integrations/jira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = await res.json() as { success?: boolean; displayName?: string; error?: string };
      setJiraTestResult({ ok: !!data.success, message: data.success ? `Connected as ${data.displayName ?? "user"}` : (data.error ?? "Test failed") });
    } catch (err) {
      setJiraTestResult({ ok: false, message: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setTestingJira(false);
    }
  }

  async function handleSaveInfluxDb() {
    setSavingInfluxDb(true);
    setInfluxDbSaved(false);
    setInfluxDbError(null);
    try {
      const body: Record<string, unknown> = {
        influxDbEnabled,
        influxDbUrl: influxDbUrl.trim(),
        influxDbMode,
        influxDbOrg: influxDbOrg.trim(),
        influxDbBucket: influxDbBucket.trim(),
        influxDbDatabase: influxDbDatabase.trim(),
        influxDbUsername: influxDbUsername.trim(),
      };
      if (influxDbToken.trim()) body.influxDbToken = influxDbToken.trim();
      if (influxDbPassword.trim()) body.influxDbPassword = influxDbPassword.trim();
      await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setInfluxDbToken("");
      setInfluxDbPassword("");
      setInfluxDbSaved(true);
      setTimeout(() => setInfluxDbSaved(false), 3000);
      const fresh = await fetch("/api/settings").then((r) => r.json()) as SettingsStatus;
      setStatus(fresh);
    } catch (err) {
      setInfluxDbError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSavingInfluxDb(false);
    }
  }

  async function handleTestInfluxDb() {
    setTestingInfluxDb(true);
    setInfluxDbTestResult(null);
    try {
      const res = await fetch("/api/integrations/influxdb/test", { method: "POST" });
      const data = await res.json() as { success?: boolean; error?: string };
      setInfluxDbTestResult({ ok: !!data.success, message: data.success ? "Connection successful" : (data.error ?? "Test failed") });
    } catch (err) {
      setInfluxDbTestResult({ ok: false, message: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setTestingInfluxDb(false);
    }
  }

  async function handleSaveHealthWebhook() {
    setSavingHealthWebhook(true);
    setHealthWebhookSaved(false);
    try {
      await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ healthWebhookUrls: healthWebhookUrls.trim() }) });
      setHealthWebhookSaved(true);
      setTimeout(() => setHealthWebhookSaved(false), 3000);
      const fresh = await fetch("/api/settings").then((r) => r.json()) as SettingsStatus;
      setStatus(fresh);
    } finally {
      setSavingHealthWebhook(false);
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
    (status && healthSummarySchedule !== (status.healthSummarySchedule ?? "none")) ||
    (status && healthSummaryTo !== (status.healthSummaryTo ?? "")) ||
    (status && sessionTimeoutDays !== String(status.sessionTimeoutDays ?? 7));

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground-strong">Settings</h1>
          {status && (
            <p className="text-xs text-faint mt-1">
              Keys are stored in{" "}
              <span className="font-mono">smrt-config.json</span> and take effect
              immediately — no restart needed.
            </p>
          )}
        </div>
        <button type="button" onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-faint hover:text-foreground-muted transition-colors mt-1"
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
        <div className="flex items-center gap-2 text-muted">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      )}

      {!loading && status && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Meraki */}
          <div className="rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold text-sm text-foreground-muted uppercase tracking-wider">Cisco Meraki</h2>
            <KeyField label="API Key" fieldKey="merakiApiKey" placeholder="40-character hex key from Meraki Dashboard"
              current={status.merakiApiKeyMasked} isSet={status.merakiApiKeySet}
              value={merakiKey} onChange={setMerakiKey} />
            <div className="space-y-1.5">
              <label htmlFor="merakiBaseUrl" className="text-sm font-medium text-foreground">Base URL</label>
              <input id="merakiBaseUrl" type="text" value={merakiBaseUrl}
                onChange={(e) => setMerakiBaseUrl(e.target.value)}
                className={cn("w-full px-3 py-2 rounded-lg text-sm font-mono",
                  "bg-overlay border",
                  "focus:outline-none focus:ring-1 focus:ring-blue-500")} />
              <p className="text-xs text-faint">Change only if using a Meraki Government or private cloud instance.</p>
            </div>
          </div>

          {/* Anthropic */}
          <div className="rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold text-sm text-foreground-muted uppercase tracking-wider">Anthropic / Claude</h2>
            <KeyField label="API Key" fieldKey="anthropicApiKey" placeholder="sk-ant-api03-…"
              current={status.anthropicApiKeyMasked} isSet={status.anthropicApiKeySet}
              value={anthropicKey} onChange={setAnthropicKey} />
          </div>

          {/* SMTP / Email Reports */}
          <div className="rounded-xl border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-foreground-muted uppercase tracking-wider flex items-center gap-2">
                <Mail size={14} /> Email Reports
              </h2>
              {status.smtpConfigured ? (
                <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={12} /> SMTP configured</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-faint"><AlertCircle size={12} /> Not configured</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="SMTP Host" fieldKey="smtpHost" placeholder="smtp.example.com" value={smtpHost} onChange={setSmtpHost} />
              <TextField label="Port" fieldKey="smtpPort" placeholder="587" value={smtpPort} onChange={setSmtpPort} type="number" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="smtpUser" className="text-sm font-medium text-foreground block">Username</label>
              <input id="smtpUser" type="text" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)}
                placeholder={status.smtpConfigured ? "Enter new value to replace…" : "user@example.com"}
                className={cn("w-full px-3 py-2 rounded-lg text-sm font-mono", "bg-overlay border",
                  "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500")} />
            </div>
            <KeyField label="Password" fieldKey="smtpPass" placeholder="SMTP password or app password"
              current="" isSet={status.smtpConfigured} value={smtpPass} onChange={setSmtpPass} />
            <div className="grid grid-cols-2 gap-4">
              <TextField label="From Address" fieldKey="smtpFrom" placeholder="reports@example.com" value={smtpFrom} onChange={setSmtpFrom} />
              <div className="space-y-1.5">
                <label htmlFor="smtpTo" className="text-sm font-medium text-foreground block">To Address</label>
                <input id="smtpTo" type="text" value={smtpTo} onChange={(e) => setSmtpTo(e.target.value)}
                  placeholder="recipient@company.com, ops@company.com"
                  className={cn("w-full px-3 py-2 rounded-lg text-sm font-mono", "bg-overlay border",
                    "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                <p className="text-xs text-muted mt-1">Separate multiple addresses with commas</p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button type="button" onClick={handleTestSmtp} disabled={testingSmtp || !status.smtpConfigured}
                title={!status.smtpConfigured ? "Save SMTP credentials first" : undefined}
                className="px-4 py-1.5 rounded-lg border border-strong hover:border-strong disabled:opacity-40 text-sm transition-colors flex items-center gap-2">
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
            <div className="flex items-center justify-between pt-2 border-t border">
              <div>
                <label htmlFor="reportSchedule" className="text-sm font-medium text-foreground">Auto-send report</label>
                <p className="text-xs text-muted mt-0.5">Automatically emails an HTML report on a schedule. Requires SMTP.</p>
              </div>
              <select id="reportSchedule" value={reportSchedule} onChange={(e) => setReportSchedule(e.target.value)}
                className={cn("px-3 py-1.5 rounded-lg text-sm", "bg-overlay border",
                  "focus:outline-none focus:ring-1 focus:ring-blue-500")}>
                <option value="none">Off</option>
                <option value="daily">Daily at 7am</option>
                <option value="weekly">Monday at 7am</option>
              </select>
            </div>
            <div className="pt-2 border-t space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="healthSummarySchedule" className="text-sm font-medium text-foreground">Org health summary email</label>
                  <p className="text-xs text-muted mt-0.5">Single email summarising all network health scores. Requires SMTP.</p>
                </div>
                <select id="healthSummarySchedule" value={healthSummarySchedule} onChange={(e) => setHealthSummarySchedule(e.target.value)}
                  className={cn("px-3 py-1.5 rounded-lg text-sm", "bg-overlay border",
                    "focus:outline-none focus:ring-1 focus:ring-blue-500")}>
                  <option value="none">Off</option>
                  <option value="daily">Daily at 8am</option>
                  <option value="weekly">Monday at 8am</option>
                </select>
              </div>
              {healthSummarySchedule !== "none" && (
                <div className="space-y-1">
                  <label htmlFor="healthSummaryTo" className="text-xs text-muted">Override recipient (leave blank to use SMTP &quot;To&quot;)</label>
                  <input id="healthSummaryTo" type="email" value={healthSummaryTo}
                    onChange={(e) => setHealthSummaryTo(e.target.value)}
                    placeholder="ops@example.com"
                    className={cn("w-full px-3 py-2 rounded-lg text-sm", "bg-overlay border",
                      "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                </div>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold text-sm text-foreground-muted uppercase tracking-wider">Notifications</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="slackWebhookUrl" className="text-sm font-medium text-foreground">Slack Webhook URL</label>
                {status.slackWebhookSet && (
                  <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={12} /> Configured</span>
                )}
              </div>
              <div className="flex gap-2">
                <input id="slackWebhookUrl" type="text" value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  placeholder={status.slackWebhookSet ? "Enter new URL to replace…" : "https://hooks.slack.com/services/…"}
                  className={cn("flex-1 px-3 py-2 rounded-lg text-sm font-mono", "bg-overlay border",
                    "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                <button type="button" onClick={() => handleTestWebhook("slack")}
                  disabled={testingSlack || !status.slackWebhookSet}
                  title={!status.slackWebhookSet ? "Save Slack webhook URL first" : undefined}
                  className="px-3 py-1.5 rounded-lg border border-strong hover:border-strong disabled:opacity-40 text-sm transition-colors flex items-center gap-1.5 whitespace-nowrap">
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
              <p className="text-xs text-faint">Separate multiple webhook URLs with commas to send to multiple Slack channels</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="teamsWebhookUrl" className="text-sm font-medium text-foreground">Teams Webhook URL</label>
                {status.teamsWebhookSet && (
                  <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={12} /> Configured</span>
                )}
              </div>
              <div className="flex gap-2">
                <input id="teamsWebhookUrl" type="text" value={teamsWebhookUrl}
                  onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                  placeholder={status.teamsWebhookSet ? "Enter new URL to replace…" : "https://outlook.office.com/webhook/…"}
                  className={cn("flex-1 px-3 py-2 rounded-lg text-sm font-mono", "bg-overlay border",
                    "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                <button type="button" onClick={() => handleTestWebhook("teams")}
                  disabled={testingTeams || !status.teamsWebhookSet}
                  title={!status.teamsWebhookSet ? "Save Teams webhook URL first" : undefined}
                  className="px-3 py-1.5 rounded-lg border border-strong hover:border-strong disabled:opacity-40 text-sm transition-colors flex items-center gap-1.5 whitespace-nowrap">
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
              <p className="text-xs text-faint">Separate multiple webhook URLs with commas to send to multiple Teams channels</p>
            </div>
          </div>

          {/* Alerting */}
          <div className="rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold text-sm text-foreground-muted uppercase tracking-wider flex items-center gap-2">Alerting</h2>
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="alertingEnabled" className="text-sm font-medium text-foreground">Enable proactive alerting</label>
                <p className="text-xs text-muted mt-0.5">
                  Polls all networks every 5 min and alerts if health drops below threshold.
                </p>
              </div>
              <input id="alertingEnabled" type="checkbox" checked={alertingEnabled}
                onChange={(e) => setAlertingEnabled(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-500 cursor-pointer" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="alertThreshold" className="text-sm font-medium text-foreground block">Alert threshold (health score)</label>
                <input id="alertThreshold" type="number" min={0} max={100} value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  className={cn("w-full px-3 py-2 rounded-lg text-sm font-mono", "bg-overlay border",
                    "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                <p className="text-xs text-faint">Default: 80 (0–100)</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="alertCooldownMinutes" className="text-sm font-medium text-foreground block">Alert cooldown (minutes)</label>
                <input id="alertCooldownMinutes" type="number" min={1} value={alertCooldownMinutes}
                  onChange={(e) => setAlertCooldownMinutes(e.target.value)}
                  className={cn("w-full px-3 py-2 rounded-lg text-sm font-mono", "bg-overlay border",
                    "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                <p className="text-xs text-faint">Min minutes between alerts for same network. Default: 60</p>
              </div>
            </div>
            <div className="pt-2 border-t space-y-3">
              <label className="text-sm font-medium text-foreground">Mute Alerts</label>
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
                    className="px-3 py-1.5 rounded-lg border border-strong hover:border-strong disabled:opacity-40 text-sm transition-colors">
                    Clear Mute
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input type="datetime-local" value={muteUntilInput} onChange={(e) => setMuteUntilInput(e.target.value)}
                    className={cn("px-3 py-2 rounded-lg text-sm font-mono", "bg-overlay border",
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
                    className="px-4 py-2 rounded-lg bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-2">
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

          {/* Per-Network Report Recipients */}
          <NetworkReportRecipientsSection
            orgId={status.activeOrgId}
            currentRecipients={status.networkReportRecipients ?? {}}
            onSaved={() => {
              fetch("/api/settings").then((r) => r.json()).then((d: SettingsStatus) => setStatus(d)).catch(() => {});
            }}
          />

          {/* Security */}
          <div className="rounded-xl border p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-foreground-muted uppercase tracking-wider flex items-center gap-2">
                <Lock size={14} /> Security
              </h2>
              {status.appPasswordSet ? (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle size={12} /> Password protection: Enabled
                </span>
              ) : (
                <span className="text-xs text-faint">Not set — app is open</span>
              )}
            </div>

            {/* Session timeout */}
            <div className="space-y-1.5">
              <label htmlFor="sessionTimeoutDays" className="text-sm font-medium text-foreground block">
                Session timeout (days)
              </label>
              <input id="sessionTimeoutDays" type="number" min={1} max={365} value={sessionTimeoutDays}
                onChange={(e) => setSessionTimeoutDays(e.target.value)}
                className={cn("w-28 px-3 py-2 rounded-lg text-sm font-mono", "bg-overlay border",
                  "focus:outline-none focus:ring-1 focus:ring-blue-500")} />
              <p className="text-xs text-faint">How long sign-in sessions last before requiring re-authentication. Default: 7 days.</p>
            </div>

            {/* Admin password */}
            <div className="pt-3 border-t space-y-3">
              <p className="text-xs text-muted">
                Set a password to protect access to SmrtNetwork. Leave blank to disable.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="newPass" className="text-sm font-medium text-foreground block">New admin password</label>
                  <input id="newPass" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)}
                    placeholder="New password…"
                    className={cn("w-full px-3 py-2 rounded-lg text-sm", "bg-overlay border",
                      "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="confirmPass" className="text-sm font-medium text-foreground block">Confirm</label>
                  <input id="confirmPass" type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Confirm password…"
                    className={cn("w-full px-3 py-2 rounded-lg text-sm", "bg-overlay border",
                      "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleSetPassword} disabled={savingPass || isReadonly}
                  className="px-4 py-1.5 rounded-lg bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-2">
                  {savingPass && <Loader2 size={13} className="animate-spin" />}
                  Set Password
                </button>
                {status.appPasswordSet && (
                  <button type="button" onClick={handleRemovePassword} disabled={savingPass || isReadonly}
                    className="px-4 py-1.5 rounded-lg border border-strong hover:border-red-500/40 hover:text-red-400 disabled:opacity-40 text-sm transition-colors">
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
            <div className="pt-3 border-t space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Read-only password</p>
                  <p className="text-xs text-muted mt-0.5">
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
                  <label htmlFor="newReadonlyPass" className="text-sm font-medium text-foreground block">New read-only password</label>
                  <input id="newReadonlyPass" type="password" value={newReadonlyPass}
                    onChange={(e) => setNewReadonlyPass(e.target.value)} placeholder="Read-only password…"
                    className={cn("w-full px-3 py-2 rounded-lg text-sm", "bg-overlay border",
                      "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="confirmReadonlyPass" className="text-sm font-medium text-foreground block">Confirm</label>
                  <input id="confirmReadonlyPass" type="password" value={confirmReadonlyPass}
                    onChange={(e) => setConfirmReadonlyPass(e.target.value)} placeholder="Confirm…"
                    className={cn("w-full px-3 py-2 rounded-lg text-sm", "bg-overlay border",
                      "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleSetReadonlyPassword} disabled={savingReadonlyPass || isReadonly}
                  className="px-4 py-1.5 rounded-lg bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-2">
                  {savingReadonlyPass && <Loader2 size={13} className="animate-spin" />}
                  Set Read-only Password
                </button>
                {status.readonlyPasswordSet && (
                  <button type="button" onClick={handleRemoveReadonlyPassword} disabled={savingReadonlyPass || isReadonly}
                    className="px-4 py-1.5 rounded-lg border border-strong hover:border-red-500/40 hover:text-red-400 disabled:opacity-40 text-sm transition-colors">
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
          <div className="rounded-xl border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-foreground-muted uppercase tracking-wider flex items-center gap-2">
                <Server size={14} /> LDAP / Active Directory
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={ldapEnabled} onChange={(e) => setLdapEnabled(e.target.checked)}
                  disabled={isReadonly}
                  className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer" />
                <span className="text-xs text-foreground-muted">Enable LDAP</span>
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
                    <label className="text-sm font-medium text-foreground block">
                      Service Account Password
                      {status.ldapBindPasswordSet && (
                        <span className="ml-2 text-xs text-green-400 font-normal">set</span>
                      )}
                    </label>
                    <input type="password" value={ldapBindPassword} onChange={(e) => setLdapBindPassword(e.target.value)}
                      placeholder={status.ldapBindPasswordSet ? "Enter new value to replace…" : "Service account password…"}
                      className={cn("w-full px-3 py-2 rounded-lg text-sm font-mono", "bg-overlay border",
                        "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                  </div>
                </div>
                <TextField label="User filter" fieldKey="ldapUserFilter"
                  placeholder="(sAMAccountName={{username}})"
                  value={ldapUserFilter} onChange={setLdapUserFilter} />
                <p className="text-xs text-faint">
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
                <p className="text-xs text-faint">
                  If no groups are set, any valid directory user gets admin access. If only the admin group is set, users outside it are denied.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button type="button" onClick={handleSaveLdap} disabled={savingLdap || isReadonly}
                className="px-4 py-1.5 rounded-lg bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-2">
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

          {/* Integrations — ServiceNow */}
          <div className="rounded-xl border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-foreground-muted uppercase tracking-wider flex items-center gap-2">
                <Server size={14} /> ServiceNow
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={serviceNowEnabled} onChange={(e) => setServiceNowEnabled(e.target.checked)}
                  disabled={isReadonly} className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer" />
                <span className="text-xs text-foreground-muted">Enable</span>
              </label>
            </div>
            <p className="text-xs text-faint">Automatically creates a ServiceNow incident when a network health alert fires.</p>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Instance URL" fieldKey="serviceNowInstanceUrl"
                placeholder="https://company.service-now.com"
                value={serviceNowInstanceUrl} onChange={setServiceNowInstanceUrl} />
              <TextField label="Username" fieldKey="serviceNowUsername"
                placeholder="admin"
                value={serviceNowUsername} onChange={setServiceNowUsername} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground block">
                Password {status?.serviceNowPasswordSet && <span className="ml-2 text-xs text-green-400 font-normal">set</span>}
              </label>
              <input type="password" value={serviceNowPassword} onChange={(e) => setServiceNowPassword(e.target.value)}
                placeholder={status?.serviceNowPasswordSet ? "Enter new value to replace…" : "ServiceNow password…"}
                className={cn("w-full px-3 py-2 rounded-lg text-sm font-mono", "bg-overlay border",
                  "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500")} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <TextField label="Assignment Group (opt)" fieldKey="serviceNowAssignmentGroup"
                placeholder="Network Operations" value={serviceNowAssignmentGroup} onChange={setServiceNowAssignmentGroup} />
              <TextField label="Category (opt)" fieldKey="serviceNowCategory"
                placeholder="Network" value={serviceNowCategory} onChange={setServiceNowCategory} />
              <TextField label="CMDB CI (opt)" fieldKey="serviceNowCmdbCi"
                placeholder="CI sys_id" value={serviceNowCmdbCi} onChange={setServiceNowCmdbCi} />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button type="button" onClick={handleSaveServiceNow} disabled={savingServiceNow || isReadonly}
                className="px-4 py-1.5 rounded-lg bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-2">
                {savingServiceNow && <Loader2 size={13} className="animate-spin" />}
                Save ServiceNow
              </button>
              <button type="button" onClick={handleTestServiceNow}
                disabled={testingServiceNow || !status?.serviceNowPasswordSet || !serviceNowInstanceUrl}
                title={!status?.serviceNowPasswordSet ? "Save credentials first" : undefined}
                className="px-3 py-1.5 rounded-lg border border-strong hover:border-strong disabled:opacity-40 text-sm transition-colors flex items-center gap-2">
                {testingServiceNow && <Loader2 size={13} className="animate-spin" />}
                Test Connection
              </button>
              {serviceNowSaved && <span className="flex items-center gap-1.5 text-sm text-green-400"><CheckCircle size={13} /> Saved</span>}
              {serviceNowError && <span className="flex items-center gap-1.5 text-sm text-red-400"><AlertCircle size={13} /> {serviceNowError}</span>}
              {serviceNowTestResult && (
                <span className={cn("flex items-center gap-1.5 text-sm", serviceNowTestResult.ok ? "text-green-400" : "text-red-400")}>
                  {serviceNowTestResult.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                  {serviceNowTestResult.message}
                </span>
              )}
            </div>
          </div>

          {/* Integrations — Jira */}
          <div className="rounded-xl border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-foreground-muted uppercase tracking-wider flex items-center gap-2">
                <Link2 size={14} /> Jira
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={jiraEnabled} onChange={(e) => setJiraEnabled(e.target.checked)}
                  disabled={isReadonly} className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer" />
                <span className="text-xs text-foreground-muted">Enable</span>
              </label>
            </div>
            <p className="text-xs text-faint">Create Jira issues from device AI diagnosis results.</p>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Jira URL" fieldKey="jiraUrl"
                placeholder="https://company.atlassian.net"
                value={jiraUrl} onChange={setJiraUrl} />
              <TextField label="Email" fieldKey="jiraEmail"
                placeholder="user@company.com"
                value={jiraEmail} onChange={setJiraEmail} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground block">
                API Token {status?.jiraApiTokenSet && <span className="ml-2 text-xs text-green-400 font-normal">set</span>}
              </label>
              <input type="password" value={jiraApiToken} onChange={(e) => setJiraApiToken(e.target.value)}
                placeholder={status?.jiraApiTokenSet ? "Enter new token to replace…" : "Jira API token…"}
                className={cn("w-full px-3 py-2 rounded-lg text-sm font-mono", "bg-overlay border",
                  "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Project Key" fieldKey="jiraProjectKey"
                placeholder="NET" value={jiraProjectKey} onChange={setJiraProjectKey} />
              <TextField label="Issue Type" fieldKey="jiraIssueType"
                placeholder="Bug" value={jiraIssueType} onChange={setJiraIssueType} />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button type="button" onClick={handleSaveJira} disabled={savingJira || isReadonly}
                className="px-4 py-1.5 rounded-lg bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-2">
                {savingJira && <Loader2 size={13} className="animate-spin" />}
                Save Jira
              </button>
              <button type="button" onClick={handleTestJira}
                disabled={testingJira || !status?.jiraApiTokenSet || !jiraUrl}
                title={!status?.jiraApiTokenSet ? "Save API token first" : undefined}
                className="px-3 py-1.5 rounded-lg border border-strong hover:border-strong disabled:opacity-40 text-sm transition-colors flex items-center gap-2">
                {testingJira && <Loader2 size={13} className="animate-spin" />}
                Test Connection
              </button>
              {jiraSaved && <span className="flex items-center gap-1.5 text-sm text-green-400"><CheckCircle size={13} /> Saved</span>}
              {jiraError && <span className="flex items-center gap-1.5 text-sm text-red-400"><AlertCircle size={13} /> {jiraError}</span>}
              {jiraTestResult && (
                <span className={cn("flex items-center gap-1.5 text-sm", jiraTestResult.ok ? "text-green-400" : "text-red-400")}>
                  {jiraTestResult.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                  {jiraTestResult.message}
                </span>
              )}
            </div>
          </div>

          {/* Integrations — InfluxDB */}
          <div className="rounded-xl border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-foreground-muted uppercase tracking-wider flex items-center gap-2">
                <Database size={14} /> InfluxDB
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={influxDbEnabled} onChange={(e) => setInfluxDbEnabled(e.target.checked)}
                  disabled={isReadonly} className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer" />
                <span className="text-xs text-foreground-muted">Enable</span>
              </label>
            </div>
            <p className="text-xs text-faint">Writes network health score and device counts to InfluxDB on every poll (every 5 min). Visualize in Grafana.</p>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="URL" fieldKey="influxDbUrl"
                placeholder="http://localhost:8086" value={influxDbUrl} onChange={setInfluxDbUrl} />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground block">API Version</label>
                <select value={influxDbMode} onChange={(e) => setInfluxDbMode(e.target.value as "v1" | "v2")}
                  disabled={isReadonly}
                  className={cn("w-full px-3 py-2 rounded-lg text-sm", "bg-overlay border",
                    "focus:outline-none focus:ring-1 focus:ring-blue-500")}>
                  <option value="v2">InfluxDB v2 (token auth)</option>
                  <option value="v1">InfluxDB v1 (user/pass)</option>
                </select>
              </div>
            </div>
            {influxDbMode === "v2" ? (
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Organization" fieldKey="influxDbOrg"
                  placeholder="my-org" value={influxDbOrg} onChange={setInfluxDbOrg} />
                <TextField label="Bucket" fieldKey="influxDbBucket"
                  placeholder="network-health" value={influxDbBucket} onChange={setInfluxDbBucket} />
                <div className="col-span-2 space-y-1.5">
                  <label className="text-sm font-medium text-foreground block">
                    API Token {status?.influxDbTokenSet && <span className="ml-2 text-xs text-green-400 font-normal">set</span>}
                  </label>
                  <input type="password" value={influxDbToken} onChange={(e) => setInfluxDbToken(e.target.value)}
                    placeholder={status?.influxDbTokenSet ? "Enter new token to replace…" : "InfluxDB v2 token…"}
                    className={cn("w-full px-3 py-2 rounded-lg text-sm font-mono", "bg-overlay border",
                      "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Database" fieldKey="influxDbDatabase"
                  placeholder="network_health" value={influxDbDatabase} onChange={setInfluxDbDatabase} />
                <TextField label="Username (opt)" fieldKey="influxDbUsername"
                  placeholder="admin" value={influxDbUsername} onChange={setInfluxDbUsername} />
                <div className="col-span-2 space-y-1.5">
                  <label className="text-sm font-medium text-foreground block">
                    Password (opt) {status?.influxDbPasswordSet && <span className="ml-2 text-xs text-green-400 font-normal">set</span>}
                  </label>
                  <input type="password" value={influxDbPassword} onChange={(e) => setInfluxDbPassword(e.target.value)}
                    placeholder={status?.influxDbPasswordSet ? "Enter new value to replace…" : "InfluxDB password (optional)…"}
                    className={cn("w-full px-3 py-2 rounded-lg text-sm font-mono", "bg-overlay border",
                      "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500")} />
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 pt-1">
              <button type="button" onClick={handleSaveInfluxDb} disabled={savingInfluxDb || isReadonly}
                className="px-4 py-1.5 rounded-lg bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-2">
                {savingInfluxDb && <Loader2 size={13} className="animate-spin" />}
                Save InfluxDB
              </button>
              <button type="button" onClick={handleTestInfluxDb}
                disabled={testingInfluxDb || !influxDbUrl}
                className="px-3 py-1.5 rounded-lg border border-strong hover:border-strong disabled:opacity-40 text-sm transition-colors flex items-center gap-2">
                {testingInfluxDb && <Loader2 size={13} className="animate-spin" />}
                Test Connection
              </button>
              {influxDbSaved && <span className="flex items-center gap-1.5 text-sm text-green-400"><CheckCircle size={13} /> Saved</span>}
              {influxDbError && <span className="flex items-center gap-1.5 text-sm text-red-400"><AlertCircle size={13} /> {influxDbError}</span>}
              {influxDbTestResult && (
                <span className={cn("flex items-center gap-1.5 text-sm", influxDbTestResult.ok ? "text-green-400" : "text-red-400")}>
                  {influxDbTestResult.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                  {influxDbTestResult.message}
                </span>
              )}
            </div>
          </div>

          {/* Integrations — Generic Health Webhook */}
          <div className="rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold text-sm text-foreground-muted uppercase tracking-wider flex items-center gap-2">
              <Link2 size={14} /> Health Event Webhook
            </h2>
            <p className="text-xs text-faint">
              POSTs a JSON payload to these URLs whenever a health alert fires. Separate multiple URLs with commas.
            </p>
            <div className="flex gap-2">
              <input type="text" value={healthWebhookUrls} onChange={(e) => setHealthWebhookUrls(e.target.value)}
                placeholder="https://your-server/webhook, https://another-server/hook"
                className={cn("flex-1 px-3 py-2 rounded-lg text-sm font-mono", "bg-overlay border",
                  "placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500")} />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button type="button" onClick={handleSaveHealthWebhook} disabled={savingHealthWebhook || isReadonly}
                className="px-4 py-1.5 rounded-lg bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-2">
                {savingHealthWebhook && <Loader2 size={13} className="animate-spin" />}
                Save Webhook URLs
              </button>
              {healthWebhookSaved && <span className="flex items-center gap-1.5 text-sm text-green-400"><CheckCircle size={13} /> Saved</span>}
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving || !hasChanges || isReadonly}
              className="px-5 py-2 rounded-lg bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-2">
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
