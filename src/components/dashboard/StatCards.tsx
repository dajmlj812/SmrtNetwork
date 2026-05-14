"use client";

import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import { Server, CheckCircle, AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

function StatCard({ label, value, icon: Icon, colorClass, loading }: StatCardProps) {
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
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-white/50 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export function StatCards() {
  const { selectedNetwork, orgId } = useNetwork();

  const { data, isLoading } = useQuery<StatsResponse>({
    queryKey: ["stats", selectedNetwork?.id, orgId],
    queryFn: async () => {
      const res = await fetch(
        `/api/meraki/stats?networkId=${selectedNetwork!.id}&orgId=${orgId}`
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

  if (!selectedNetwork) return null;

  const offlineAlerting = (data?.offline ?? 0) + (data?.alerting ?? 0);
  const hasProblems = offlineAlerting > 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
