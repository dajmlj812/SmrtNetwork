"use client";

import { useState } from "react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertIntentResult } from "@/app/api/analyze/alert-intent/route";

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  slack: "Slack",
  teams: "Teams",
  webhook: "Webhook",
  servicenow: "ServiceNow",
};

export function AlertIntentCreator() {
  const { orgId } = useNetwork();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AlertIntentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  async function handleAnalyze() {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setApplied(false);

    try {
      const res = await fetch("/api/analyze/alert-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, orgId }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Request failed");
      }
      const data = (await res.json()) as AlertIntentResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!result) return;
    // POST the parsed config to settings to add a threshold rule
    // For now, just mark as applied — the alert fires on the next poller cycle
    // based on existing threshold logic. Full per-network threshold is already
    // supported via networkThresholds in config.
    try {
      if (result.networkId) {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            networkThresholds: { [result.networkId]: result.threshold },
          }),
        });
      } else {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alertThreshold: result.threshold }),
        });
      }
      setApplied(true);
    } catch {
      setError("Failed to save alert configuration");
    }
  }

  return (
    <div className="rounded-xl border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="text-purple-400" />
        <h2 className="font-semibold text-sm text-foreground-muted uppercase tracking-wider">
          Create Alert with AI
        </h2>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void handleAnalyze(); }}
          placeholder='e.g. "Alert me on Slack when RJW HQ drops below 75%"'
          className="flex-1 rounded-lg bg-overlay border px-3 py-2 text-sm text-foreground-strong placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => void handleAnalyze()}
          disabled={loading || !prompt.trim()}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            "bg-purple-600/20 text-purple-300 border border-purple-500/30",
            "hover:bg-purple-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Analyze
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {result && !applied && (
        <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-foreground">{result.description}</p>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full shrink-0",
                result.confidence === "high"
                  ? "bg-green-500/20 text-green-300"
                  : result.confidence === "medium"
                  ? "bg-yellow-500/20 text-yellow-300"
                  : "bg-red-500/20 text-red-300"
              )}
            >
              {result.confidence} confidence
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="text-muted">Network</div>
            <div className="text-foreground-muted">{result.networkName ?? "All networks"}</div>
            <div className="text-muted">Threshold</div>
            <div className="text-foreground-muted">Below {result.threshold}%</div>
            <div className="text-muted">Channels</div>
            <div className="text-foreground-muted">
              {result.channels.map((c) => CHANNEL_LABELS[c] ?? c).join(", ")}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleApply()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600/20 text-green-300 border border-green-500/30 hover:bg-green-600/30 transition-colors"
            >
              <Check size={12} />
              Apply threshold
            </button>
            <button
              type="button"
              onClick={() => { setResult(null); setPrompt(""); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted hover:text-foreground-muted transition-colors"
            >
              <X size={12} />
              Dismiss
            </button>
          </div>
        </div>
      )}

      {applied && (
        <div className="flex items-center gap-2 text-sm text-green-400">
          <Check size={14} />
          Alert threshold saved. The poller will use it on the next cycle.
        </div>
      )}
    </div>
  );
}
