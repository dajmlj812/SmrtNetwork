"use client";

import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import type { NetworkSnapshot } from "@/lib/snapshots";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function ClientTrendChart() {
  const { selectedNetwork } = useNetwork();

  const { data: snapshots, isLoading } = useQuery<NetworkSnapshot[]>({
    queryKey: ["snapshots", selectedNetwork?.id],
    queryFn: async () => {
      const res = await fetch(`/api/snapshots?networkId=${selectedNetwork!.id}&limit=288`);
      if (!res.ok) throw new Error("Failed to load snapshots");
      return res.json() as Promise<NetworkSnapshot[]>;
    },
    enabled: !!selectedNetwork,
    staleTime: 5 * 60_000,
  });

  if (!selectedNetwork) return null;

  const chartData = (snapshots ?? []).map((s) => ({
    time: formatTime(s.capturedAt),
    clients: s.stats.clientCount,
  }));

  const hasData = chartData.some((d) => d.clients > 0);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">Connected clients · last 24h · polled every 5 min</p>

      {isLoading && (
        <div className="h-[160px] flex items-center justify-center">
          <div className="h-4 w-32 bg-overlay-strong rounded animate-pulse" />
        </div>
      )}

      {!isLoading && !hasData && (
        <p className="text-sm text-muted py-8 text-center">
          No client history yet — data appears after the poller runs.
        </p>
      )}

      {!isLoading && hasData && (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="time"
              tick={{ fill: "var(--faint)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "var(--faint)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--tooltip-bg)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--tooltip-fg)",
                fontSize: "12px",
              }}
              formatter={(v) => [v, "Clients"]}
            />
            <Line
              type="monotone"
              dataKey="clients"
              name="Clients"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
