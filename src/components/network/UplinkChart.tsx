"use client";

import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import type { LossAndLatency } from "@/lib/meraki/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface UplinkDevice {
  serial: string;
  name: string;
  model: string;
  history: LossAndLatency[];
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function DeviceChart({ device }: { device: UplinkDevice }) {
  const chartData = device.history.map((point) => ({
    time: formatTime(point.startTs),
    lossPercent: point.lossPercent,
    latencyMs: point.latencyMs,
  }));

  return (
    <div className="rounded-xl border border-white/10 p-5 space-y-3">
      <div>
        <h3 className="font-semibold text-sm text-white">{device.name || device.serial}</h3>
        <p className="text-xs text-white/40">{device.model} · WAN1 · Last 24h</p>
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-white/40">No uplink history available for this device.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="time"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="latency"
              orientation="left"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}ms`}
            />
            <YAxis
              yAxisId="loss"
              orientation="right"
              domain={[0, 100]}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "rgba(255,255,255,0.8)",
                fontSize: "12px",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}
            />
            <Line
              yAxisId="latency"
              type="monotone"
              dataKey="latencyMs"
              name="Latency (ms)"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="loss"
              type="monotone"
              dataKey="lossPercent"
              name="Loss (%)"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-xl border border-white/10 p-5 space-y-3">
      <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
      <div className="h-3 w-48 bg-white/5 rounded animate-pulse" />
      <div className="h-48 bg-white/5 rounded-lg animate-pulse" />
    </div>
  );
}

export function UplinkChart() {
  const { selectedNetwork } = useNetwork();

  const { data, isLoading } = useQuery<UplinkDevice[]>({
    queryKey: ["uplink", selectedNetwork?.id],
    queryFn: async () => {
      const res = await fetch(`/api/meraki/uplink?networkId=${selectedNetwork!.id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to load uplink data");
      }
      return res.json() as Promise<UplinkDevice[]>;
    },
    enabled: !!selectedNetwork,
    staleTime: 5 * 60_000,
  });

  if (!selectedNetwork) return null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonChart />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 p-5">
        <p className="text-sm text-white/40">No WAN appliances in this network</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-sm text-white/60 uppercase tracking-wider">
        WAN Uplink Health
      </h2>
      {data.map((device) => (
        <DeviceChart key={device.serial} device={device} />
      ))}
    </div>
  );
}
