"use client";

import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import { formatBytes } from "@/lib/utils";
import type { BandwidthPeriod } from "@/app/api/meraki/bandwidth/route";

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/10 p-4 space-y-2 animate-pulse">
      <div className="h-3 w-20 bg-white/10 rounded" />
      <div className="h-6 w-28 bg-white/10 rounded" />
      <div className="h-3 w-24 bg-white/5 rounded" />
      <div className="h-3 w-24 bg-white/5 rounded" />
      <div className="h-3 w-16 bg-white/5 rounded" />
    </div>
  );
}

function BandwidthCard({
  period,
  isAboveAverage,
}: {
  period: BandwidthPeriod;
  isAboveAverage: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <p className="font-semibold text-sm text-white">{period.label}</p>
        {isAboveAverage && (
          <span
            className="inline-block w-2 h-2 rounded-full bg-yellow-400 shrink-0"
            title="Above average rate"
          />
        )}
      </div>
      <p className="text-2xl font-bold text-white">{formatBytes(period.total)}</p>
      <div className="space-y-0.5">
        <p className="text-xs text-blue-400">
          ↓ {formatBytes(period.recv)}
        </p>
        <p className="text-xs text-green-400">
          ↑ {formatBytes(period.sent)}
        </p>
      </div>
      <p className="text-xs text-white/40">{period.clients} clients</p>
    </div>
  );
}

export function BandwidthSummary() {
  const { selectedNetwork } = useNetwork();

  const { data, isLoading } = useQuery<BandwidthPeriod[]>({
    queryKey: ["bandwidth", selectedNetwork?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/meraki/bandwidth?networkId=${selectedNetwork!.id}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to load bandwidth data");
      }
      return res.json() as Promise<BandwidthPeriod[]>;
    },
    enabled: !!selectedNetwork,
    staleTime: 120_000,
  });

  if (!selectedNetwork) return null;

  // Compute above-average flag: compare each period's bytes-per-second rate to 24h rate
  // period at index 2 is the 24h window (86400s)
  const period24h = data?.[2];
  const rate24h =
    period24h && period24h.timespan > 0
      ? period24h.total / period24h.timespan
      : null;

  function isAboveAverage(period: BandwidthPeriod): boolean {
    if (rate24h === null || period.timespan === 0) return false;
    const rate = period.total / period.timespan;
    return rate > rate24h;
  }

  const allZero =
    data !== undefined &&
    data.every((p) => p.total === 0 && p.clients === 0);

  return (
    <div className="rounded-xl border border-white/10 p-5 space-y-4">
      <h2 className="font-semibold text-white">Bandwidth by Time Window</h2>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : allZero ? (
        <p className="text-sm text-white/40">
          No bandwidth data available for this network.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(data ?? []).map((period) => (
            <BandwidthCard
              key={period.timespan}
              period={period}
              isAboveAverage={isAboveAverage(period)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
