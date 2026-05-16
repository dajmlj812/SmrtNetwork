"use client";

import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function BandwidthTrendChart() {
  const { selectedNetwork } = useNetwork();

  const { data: snapshots, isLoading } = useQuery<NetworkSnapshot[]>({
    queryKey: ["snapshots", selectedNetwork?.id, "bandwidth"],
    queryFn: async () => {
      const res = await fetch(
        `/api/snapshots?networkId=${selectedNetwork!.id}&limit=48`
      );
      if (!res.ok) return [];
      return res.json() as Promise<NetworkSnapshot[]>;
    },
    enabled: !!selectedNetwork,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  if (!selectedNetwork) return null;

  const hasBandwidth = snapshots?.some(
    (s) => (s.stats.sentBytes ?? 0) > 0 || (s.stats.recvBytes ?? 0) > 0
  );

  const chartData =
    snapshots?.map((s) => ({
      time: formatTime(s.capturedAt),
      sent: s.stats.sentBytes ?? 0,
      recv: s.stats.recvBytes ?? 0,
    })) ?? [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">Sent · received · last 48 snapshots</p>

      {isLoading && (
        <div className="h-[160px] flex items-center justify-center">
          <div className="h-4 w-32 bg-overlay-strong rounded animate-pulse" />
        </div>
      )}

      {!isLoading && !hasBandwidth && (
        <p className="text-sm text-muted py-8 text-center">
          No bandwidth history yet — data captures every 5 minutes.
        </p>
      )}

      {!isLoading && hasBandwidth && (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--info)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--info)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="recvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: "var(--faint)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--faint)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatBytes(v)}
              width={60}
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
              formatter={(value, name) => [
                formatBytes(typeof value === "number" ? value : 0),
                name === "sent" ? "Sent" : "Received",
              ]}
            />
            <Legend
              formatter={(value) => (value === "sent" ? "Sent" : "Received")}
              wrapperStyle={{ fontSize: 11, color: "var(--muted)" }}
            />
            <Area
              type="monotone"
              dataKey="sent"
              stroke="var(--info)"
              strokeWidth={1.5}
              fill="url(#sentGrad)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="recv"
              stroke="var(--accent)"
              strokeWidth={1.5}
              fill="url(#recvGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
