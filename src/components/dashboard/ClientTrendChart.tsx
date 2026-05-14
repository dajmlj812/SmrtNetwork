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

  if (!selectedNetwork || isLoading) return null;

  const chartData = (snapshots ?? []).map((s) => ({
    time: formatTime(s.capturedAt),
    clients: s.stats.clientCount,
  }));

  // Don't render if all counts are 0 — poller hasn't collected data yet
  const hasData = chartData.some((d) => d.clients > 0);
  if (!hasData) return null;

  return (
    <div className="rounded-xl border border-white/10 p-5 space-y-3">
      <div>
        <h2 className="font-semibold text-sm text-white/60 uppercase tracking-wider">
          Connected Clients — 24h Trend
        </h2>
        <p className="text-xs text-white/30 mt-0.5">Active clients seen in the last 5 min, polled every 5 min</p>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="time"
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(0,0,0,0.8)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "rgba(255,255,255,0.8)",
              fontSize: "12px",
            }}
            formatter={(v) => [v, "Clients"]}
          />
          <Line
            type="monotone"
            dataKey="clients"
            name="Clients"
            stroke="#1e9c4a"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
