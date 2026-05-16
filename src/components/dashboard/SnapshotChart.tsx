"use client";

import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { NetworkSnapshot } from "@/lib/snapshots";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SnapshotChart() {
  const { selectedNetwork } = useNetwork();

  const { data: snapshots, isLoading } = useQuery<NetworkSnapshot[]>({
    queryKey: ["snapshots", selectedNetwork?.id, "chart"],
    queryFn: async () => {
      const res = await fetch(
        `/api/snapshots?networkId=${selectedNetwork!.id}&limit=30`
      );
      if (!res.ok) return [];
      return res.json() as Promise<NetworkSnapshot[]>;
    },
    enabled: !!selectedNetwork,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  if (!selectedNetwork) return null;

  const latest = snapshots && snapshots.length > 0
    ? snapshots[snapshots.length - 1].stats.healthScore
    : null;

  const lineColor =
    latest === null
      ? "#6b7280"
      : latest >= 90
      ? "#22c55e"
      : latest >= 70
      ? "#eab308"
      : "#ef4444";

  const chartData =
    snapshots?.map((s) => ({
      time: formatTime(s.capturedAt),
      health: s.stats.healthScore,
    })) ?? [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">Health score · last 30 snapshots</p>

      {isLoading && (
        <div className="h-[160px] flex items-center justify-center">
          <div className="h-4 w-32 bg-overlay-strong rounded animate-pulse" />
        </div>
      )}

      {!isLoading && chartData.length === 0 && (
        <p className="text-sm text-muted py-8 text-center">
          No snapshot history yet — stats auto-capture every minute.
        </p>
      )}

      {!isLoading && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: "var(--faint)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "var(--faint)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--tooltip-bg)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--tooltip-fg)",
              }}
              labelStyle={{ color: "var(--muted)", marginBottom: 4 }}
              itemStyle={{ color: lineColor }}
              formatter={(value) => [`${value}%`, "Health Score"]}
            />
            <Line
              type="monotone"
              dataKey="health"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: lineColor }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
