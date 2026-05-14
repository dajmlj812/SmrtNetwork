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
  colorClass?: string;
  loading?: boolean;
  trend?: React.ReactNode;
}

function StatCard({ label, value, icon: Icon, colorClass, loading, trend }: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 p-5 space-y-2">
        <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
        <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 p-5 flex items-center gap-4">
      <div className={cn("p-2 rounded-lg", colorClass ?? "bg-white/5")}>
        <Icon size={20} className={cn(colorClass ? "text-white" : "text-white/50")} />
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-white">{value}</p>
          {trend}
        </div>
        <p className="text-xs text-white/50 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function TrendIndicator({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) {
    return <span className="text-xs text-white/40">—</span>;
  }
  const delta = current - previous;
  if (delta === 0) {
    return <span className="text-xs text-white/40">—</span>;
  }
  if (delta > 0) {
    return (
      <span className="text-xs font-medium text-green-400">
        ↑ +{delta}
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-red-400">
      ↓ {delta}
    </span>
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

  // Previous snapshot is the second-to-last (index 0 when we have 2)
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
        colorClass={data && data.online > 0 ? "bg-green-500/20" : undefined}
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
        colorClass={hasProblems ? "bg-red-500/20" : "bg-green-500/20"}
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
