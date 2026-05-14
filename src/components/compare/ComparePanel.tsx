"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownOutput } from "@/components/ui/MarkdownOutput";
import type { Network } from "@/lib/meraki/types";

const ORG_ID = "757480";

interface StatsResponse {
  total: number;
  online: number;
  offline: number;
  alerting: number;
  dormant: number;
  clientCount: number;
}

interface MetricRowProps {
  label: string;
  valueA: number;
  valueB: number;
  higherIsBetter?: boolean;
}

function MetricRow({ label, valueA, valueB, higherIsBetter = true }: MetricRowProps) {
  const aIsBetter = higherIsBetter ? valueA > valueB : valueA < valueB;
  const bIsBetter = higherIsBetter ? valueB > valueA : valueB < valueA;
  const delta = valueA - valueB;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1.5 border-b border-white/5">
      <span
        className={cn(
          "text-sm font-medium text-right",
          aIsBetter ? "text-green-400" : bIsBetter ? "text-red-400" : "text-white/70"
        )}
      >
        {valueA}
      </span>
      <div className="text-center space-y-0.5">
        <p className="text-xs text-white/40 leading-none">{label}</p>
        {delta !== 0 && (
          <p
            className={cn(
              "text-xs font-medium leading-none",
              delta > 0 ? "text-green-400" : "text-red-400"
            )}
          >
            {delta > 0 ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`}
          </p>
        )}
      </div>
      <span
        className={cn(
          "text-sm font-medium text-left",
          bIsBetter ? "text-green-400" : aIsBetter ? "text-red-400" : "text-white/70"
        )}
      >
        {valueB}
      </span>
    </div>
  );
}

function healthScore(stats: StatsResponse): number {
  return stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0;
}

export function ComparePanel() {
  const [networkAId, setNetworkAId] = useState<string>("");
  const [networkBId, setNetworkBId] = useState<string>("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const { data: networks, isLoading: networksLoading } = useQuery<Network[]>({
    queryKey: ["networks", ORG_ID],
    queryFn: async () => {
      const res = await fetch(`/api/meraki/networks?orgId=${ORG_ID}`);
      if (!res.ok) throw new Error("Failed to load networks");
      const data = await res.json() as Network[];
      return [...data].sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 300_000,
  });

  const networkA = networks?.find((n) => n.id === networkAId) ?? null;
  const networkB = networks?.find((n) => n.id === networkBId) ?? null;

  const { data: statsA, isLoading: loadingA } = useQuery<StatsResponse>({
    queryKey: ["stats", networkAId, ORG_ID],
    queryFn: async () => {
      const res = await fetch(
        `/api/meraki/stats?networkId=${networkAId}&orgId=${ORG_ID}&networkName=${encodeURIComponent(networkA?.name ?? networkAId)}`
      );
      if (!res.ok) throw new Error("Failed to load stats for network A");
      return res.json() as Promise<StatsResponse>;
    },
    enabled: !!networkAId,
    staleTime: 60_000,
  });

  const { data: statsB, isLoading: loadingB } = useQuery<StatsResponse>({
    queryKey: ["stats", networkBId, ORG_ID],
    queryFn: async () => {
      const res = await fetch(
        `/api/meraki/stats?networkId=${networkBId}&orgId=${ORG_ID}&networkName=${encodeURIComponent(networkB?.name ?? networkBId)}`
      );
      if (!res.ok) throw new Error("Failed to load stats for network B");
      return res.json() as Promise<StatsResponse>;
    },
    enabled: !!networkBId,
    staleTime: 60_000,
  });

  const bothSelected = !!networkAId && !!networkBId && networkAId !== networkBId;
  const bothLoaded = bothSelected && !!statsA && !!statsB;

  const scoreA = statsA ? healthScore(statsA) : null;
  const scoreB = statsB ? healthScore(statsB) : null;
  const aIsHealthier = scoreA !== null && scoreB !== null && scoreA > scoreB;
  const bIsHealthier = scoreA !== null && scoreB !== null && scoreB > scoreA;

  async function handleAiCompare() {
    if (!bothLoaded || !networkA || !networkB || !statsA || !statsB) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalysis(null);

    try {
      const res = await fetch("/api/analyze/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          networkA: { id: networkA.id, name: networkA.name, stats: statsA },
          networkB: { id: networkB.id, name: networkB.name, stats: statsB },
        }),
      });
      const data = await res.json() as { analysis?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setAnalysis(data.analysis ?? "");
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAnalyzing(false);
    }
  }

  const selectClass = cn(
    "w-full px-3 py-2 rounded-lg text-sm",
    "bg-white/5 border border-white/10",
    "focus:outline-none focus:ring-1 focus:ring-blue-500",
    "text-white"
  );

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Network selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70 block">Network A</label>
          <select
            value={networkAId}
            onChange={(e) => {
              setNetworkAId(e.target.value);
              setAnalysis(null);
            }}
            disabled={networksLoading}
            className={selectClass}
          >
            <option value="">Select a network…</option>
            {networks?.map((n) => (
              <option key={n.id} value={n.id} disabled={n.id === networkBId}>
                {n.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70 block">Network B</label>
          <select
            value={networkBId}
            onChange={(e) => {
              setNetworkBId(e.target.value);
              setAnalysis(null);
            }}
            disabled={networksLoading}
            className={selectClass}
          >
            <option value="">Select a network…</option>
            {networks?.map((n) => (
              <option key={n.id} value={n.id} disabled={n.id === networkAId}>
                {n.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison table */}
      {bothSelected && (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-2">
            <div
              className={cn(
                "p-4 text-center border-b border-white/10",
                aIsHealthier ? "bg-green-500/10" : "bg-white/3"
              )}
            >
              <p className="font-semibold text-sm text-white">{networkA?.name}</p>
              {(loadingA) && (
                <Loader2 size={14} className="animate-spin text-white/40 mx-auto mt-1" />
              )}
              {scoreA !== null && !loadingA && (
                <p className={cn("text-2xl font-bold mt-1", aIsHealthier ? "text-green-400" : bIsHealthier ? "text-red-400" : "text-white")}>
                  {scoreA}%
                </p>
              )}
              {aIsHealthier && (
                <span className="text-xs text-green-400 font-medium">Better</span>
              )}
            </div>
            <div
              className={cn(
                "p-4 text-center border-b border-l border-white/10",
                bIsHealthier ? "bg-green-500/10" : "bg-white/3"
              )}
            >
              <p className="font-semibold text-sm text-white">{networkB?.name}</p>
              {(loadingB) && (
                <Loader2 size={14} className="animate-spin text-white/40 mx-auto mt-1" />
              )}
              {scoreB !== null && !loadingB && (
                <p className={cn("text-2xl font-bold mt-1", bIsHealthier ? "text-green-400" : aIsHealthier ? "text-red-400" : "text-white")}>
                  {scoreB}%
                </p>
              )}
              {bIsHealthier && (
                <span className="text-xs text-green-400 font-medium">Better</span>
              )}
            </div>
          </div>

          {/* Metrics */}
          {bothLoaded && statsA && statsB && (
            <div className="p-4 space-y-0">
              <MetricRow label="Total Devices" valueA={statsA.total} valueB={statsB.total} />
              <MetricRow label="Online" valueA={statsA.online} valueB={statsB.online} higherIsBetter={true} />
              <MetricRow label="Offline" valueA={statsA.offline} valueB={statsB.offline} higherIsBetter={false} />
              <MetricRow label="Alerting" valueA={statsA.alerting} valueB={statsB.alerting} higherIsBetter={false} />
              <MetricRow label="Dormant" valueA={statsA.dormant} valueB={statsB.dormant} higherIsBetter={false} />
              <MetricRow label="Clients" valueA={statsA.clientCount} valueB={statsB.clientCount} />
            </div>
          )}
        </div>
      )}

      {/* AI Compare button */}
      {bothLoaded && (
        <div className="space-y-4">
          <button
            onClick={() => { void handleAiCompare(); }}
            disabled={analyzing}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-2"
          >
            {analyzing && <Loader2 size={14} className="animate-spin" />}
            {analyzing ? "Analyzing…" : "AI Compare"}
          </button>

          {analyzeError && (
            <p className="text-sm text-red-400">{analyzeError}</p>
          )}

          {analysis && (
            <div className="rounded-xl border border-white/10 p-5">
              <MarkdownOutput content={analysis} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
