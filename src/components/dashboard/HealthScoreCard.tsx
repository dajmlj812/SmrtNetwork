"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { MarkdownOutput } from "@/components/ui/MarkdownOutput";
import { cn } from "@/lib/utils";

export function HealthScoreCard() {
  const { orgId, selectedNetwork } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastNetworkId = useRef<string | null>(null);

  async function runAnalysis() {
    if (!selectedNetwork) return;
    setLoading(true);
    setAnalysis(null);
    setError(null);
    try {
      const res = await fetch("/api/analyze/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ networkId: selectedNetwork.id, orgId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analysis failed");
      } else {
        setAnalysis(data.analysis ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // Auto-run once per selected network
  useEffect(() => {
    if (!selectedNetwork) return;
    if (lastNetworkId.current === selectedNetwork.id) return;
    lastNetworkId.current = selectedNetwork.id;
    void runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNetwork?.id]);

  if (!selectedNetwork) {
    return (
      <div className="rounded-xl border bg-card p-5 h-full flex items-center justify-center text-center">
        <p className="text-sm text-muted">
          Select a network from the sidebar to load the AI health summary.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border p-5 h-full overflow-hidden",
        "bg-gradient-to-br from-accent-soft/60 via-card to-card",
        "border-accent/30"
      )}
    >
      {/* Decorative gradient orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl"
      />

      <div className="relative space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 p-1.5 rounded-lg bg-accent-soft border border-accent/30">
              <Sparkles size={14} className="text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground-strong leading-tight">
                AI Network Health
              </h2>
              <p className="text-xs text-muted mt-0.5">{selectedNetwork.name}</p>
            </div>
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className={cn(
              "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg",
              "text-foreground-muted hover:text-foreground-strong",
              "border hover:border-strong transition-colors",
              "disabled:opacity-40"
            )}
            title="Re-run analysis"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{loading ? "Analyzing" : "Refresh"}</span>
          </button>
        </div>

        {loading && !analysis && (
          <div className="space-y-2 pt-1">
            <div className="h-3 w-3/4 rounded bg-overlay-strong animate-pulse" />
            <div className="h-3 w-full rounded bg-overlay-strong animate-pulse" />
            <div className="h-3 w-5/6 rounded bg-overlay-strong animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-overlay-strong animate-pulse" />
          </div>
        )}

        {error && !loading && (
          <div className="flex items-start gap-2 text-sm text-red-400">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {analysis && <MarkdownOutput content={analysis} />}
      </div>
    </div>
  );
}
