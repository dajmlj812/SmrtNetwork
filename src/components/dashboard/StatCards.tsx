"use client";

import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import { Server, CheckCircle, AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NetworkSnapshot } from "@/lib/snapshots";

interface StatsResponse {
  total: number;
  online: number;
  offline: number;
  alerting: number;
  dormant: number;
  clientCount: number;
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tone?: "neutral" | "good" | "bad";
  loading?: boolean;
  trend?: React.ReactNode;
}

const TONE: Record<NonNullable<StatCardProps["tone"]>, { bg: string; fg: string }> = {
  neutral: { bg: "bg-overlay-strong", fg: "text-muted" },
  good:    { bg: "bg-accent-soft",    fg: "text-accent" },
  bad:     { bg: "bg-red-500/15",     fg: "text-red-500 dark:text-red-400" },
};

function StatCard({ label, value, icon: Icon, tone = "neutral", loading, trend }: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-5 space-y-2">
        <div className="h-8 w-16 bg-overlay-strong rounded animate-pulse" />
        <div className="h-3 w-24 bg-overlay rounded animate-pulse" />
      </div>
    );
  }

  const t = TONE[tone];
  return (
    <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
      <div className={cn("p-2.5 rounded-lg", t.bg)}>
        <Icon size={20} className={t.fg} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-foreground-strong tabular-nums">{value}</p>
          {trend}
        </div>
        <p className="text-xs text-muted mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function TrendIndicator({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) {
    return <span className="text-xs text-faint">—</span>;
  }
  const delta = current - previous;
  if (delta === 0) {
    return <span className="text-xs text-faint">—</span>;
  }
  if (delta > 0) {
    return (
      <span className="text-xs font-medium text-accent">↑ +{delta}</span>
    );
  }
  return (
    <span className="text-xs font-medium text-red-500 dark:text-red-400">↓ {delta}</span>
  );
}

export function StatCards() {
  const { selectedNetwork, orgId } = useNetwork();

  const { data, isLoading } = useQuery<StatsResponse>({
    queryKey: ["stats", selectedNetwork?.id, orgId],
    queryFn: async () => {
      const res = await fetch(
        `/api/meraki/stats?networkId=${selectedNetwork!.id}&orgId=${orgId}&networkName=${encodeURIComponent(selectedNetwork!.name)}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to load stats");
      }
      return res.json() as Promise<StatsResponse>;
    },
    enabled: !!selectedNetwork,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: snapshots } = useQuery<NetworkSnapshot[]>({
    queryKey: ["snapshots", selectedNetwork?.id, "trend"],
    queryFn: async () => {
      const res = await fetch(
        `/api/snapshots?networkId=${selectedNetwork!.id}&limit=2`
      );
      if (!res.ok) return [];
      return res.json() as Promise<NetworkSnapshot[]>;
    },
    enabled: !!selectedNetwork,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  if (!selectedNetwork) return null;

  const offlineAlerting = (data?.offline ?? 0) + (data?.alerting ?? 0);
  const hasProblems = offlineAlerting > 0;

  const previousOnline =
    snapshots && snapshots.length >= 2
      ? snapshots[snapshots.length - 2].stats.online
      : null;
  const currentOnline = data?.online ?? null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Devices"
        value={data?.total ?? 0}
        icon={Server}
        loading={isLoading}
      />
      <StatCard
        label="Online"
        value={data?.online ?? 0}
        icon={CheckCircle}
        tone={data && data.online > 0 ? "good" : "neutral"}
        loading={isLoading}
        trend={
          !isLoading && currentOnline !== null ? (
            <TrendIndicator current={currentOnline} previous={previousOnline} />
          ) : undefined
        }
      />
      <StatCard
        label="Offline / Alerting"
        value={offlineAlerting}
        icon={AlertTriangle}
        tone={hasProblems ? "bad" : "good"}
        loading={isLoading}
      />
      <StatCard
        label="Connected Clients"
        value={data?.clientCount ?? 0}
        icon={Users}
        loading={isLoading}
      />
    </div>
  );
}
