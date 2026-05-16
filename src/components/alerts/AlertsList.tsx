"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";
import type { AlertSettings, AlertEntry } from "@/lib/meraki/types";
import { Bell, BellOff, Mail, Users, Radio, Loader2 } from "lucide-react";
import { MarkdownOutput } from "@/components/ui/MarkdownOutput";

/** Convert camelCase to "Title Case With Spaces" */
function formatAlertType(type: string): string {
  return type
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function AlertRow({ alert }: { alert: AlertEntry }) {
  return (
    <li className="flex items-center gap-3 py-2 border-b last:border-0">
      <span
        className={cn(
          "w-2 h-2 rounded-full shrink-0",
          alert.enabled ? "bg-accent" : "bg-overlay-strong"
        )}
      />
      <span className={cn("text-sm", alert.enabled ? "text-foreground" : "text-faint")}>
        {formatAlertType(alert.type)}
      </span>
    </li>
  );
}

export function AlertsList() {
  const { selectedNetwork, orgId } = useNetwork();
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery<AlertSettings>({
    queryKey: ["alerts", selectedNetwork?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/meraki/alerts?networkId=${selectedNetwork!.id}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to load alerts");
      }
      return res.json() as Promise<AlertSettings>;
    },
    enabled: !!selectedNetwork,
    staleTime: 60_000,
  });

  async function runAiRecommendations() {
    if (!selectedNetwork) return;
    setAnalyzing(true);
    setAiResult(null);
    setAiError(null);
    try {
      const res = await fetch("/api/analyze/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ networkId: selectedNetwork.id, orgId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error((body as { error?: string }).error ?? "Analysis failed");
      setAiResult((body as { analysis?: string }).analysis ?? null);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAnalyzing(false);
    }
  }

  if (!selectedNetwork) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm text-muted">
          Select a network from the sidebar to load active alerts and AI-generated
          remediation recommendations.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5 flex items-center gap-2 text-muted">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading alert settings…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
        <p className="text-sm text-red-500 dark:text-red-400">
          {error instanceof Error ? error.message : "Failed to load alerts"}
        </p>
      </div>
    );
  }

  if (!data) return null;

  const enabledAlerts = data.alerts.filter((a) => a.enabled);
  const disabledAlerts = data.alerts.filter((a) => !a.enabled);
  const { defaultDestinations: dest } = data;

  return (
    <div className="space-y-4">
      {/* Default Destinations card */}
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Default Notification Destinations
        </h3>
        <div className="flex flex-wrap gap-4 text-sm">
          {dest.allAdmins && (
            <span className="flex items-center gap-1.5 text-foreground">
              <Users size={13} className="text-info" />
              All Admins
            </span>
          )}
          {dest.snmp && (
            <span className="flex items-center gap-1.5 text-foreground">
              <Radio size={13} className="text-purple-500 dark:text-purple-400" />
              SNMP
            </span>
          )}
          {dest.emails.length > 0 && (
            <span className="flex items-center gap-1.5 text-foreground">
              <Mail size={13} className="text-accent" />
              {dest.emails.join(", ")}
            </span>
          )}
          {!dest.allAdmins && !dest.snmp && dest.emails.length === 0 && (
            <span className="text-muted text-xs">No default destinations configured</span>
          )}
        </div>
      </div>

      {/* Alert sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={14} className="text-accent" />
            <h3 className="font-semibold text-sm text-foreground-strong">
              Enabled
              <span className="ml-2 text-xs text-muted">({enabledAlerts.length})</span>
            </h3>
          </div>
          {enabledAlerts.length === 0 ? (
            <p className="text-xs text-muted">No alerts enabled.</p>
          ) : (
            <ul>
              {enabledAlerts.map((a) => (
                <AlertRow key={a.type} alert={a} />
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <BellOff size={14} className="text-muted" />
            <h3 className="font-semibold text-sm text-foreground-strong">
              Disabled
              <span className="ml-2 text-xs text-muted">({disabledAlerts.length})</span>
            </h3>
          </div>
          {disabledAlerts.length === 0 ? (
            <p className="text-xs text-muted">All alerts are enabled.</p>
          ) : (
            <ul>
              {disabledAlerts.map((a) => (
                <AlertRow key={a.type} alert={a} />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="rounded-xl border bg-gradient-to-br from-accent-soft/40 via-card to-card border-accent/30 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground-strong">AI Recommendations</h3>
          <button
            onClick={runAiRecommendations}
            disabled={analyzing}
            className="text-xs px-3 py-1.5 rounded-lg bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-50 transition-colors flex items-center gap-1.5 font-medium"
          >
            {analyzing && <Loader2 size={12} className="animate-spin" />}
            {analyzing ? "Analyzing…" : "Get AI Recommendations"}
          </button>
        </div>

        {aiError && (
          <p className="text-xs text-red-500 dark:text-red-400">{aiError}</p>
        )}

        {aiResult && (
          <div className="border-t pt-3">
            <MarkdownOutput content={aiResult} />
          </div>
        )}

        {!aiResult && !analyzing && (
          <p className="text-sm text-muted">
            Click &quot;Get AI Recommendations&quot; to receive a health assessment and alert tuning suggestions.
          </p>
        )}
      </div>
    </div>
  );
}
