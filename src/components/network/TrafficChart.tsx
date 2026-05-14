"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useNetwork } from "@/lib/context/NetworkContext";
import { formatBytes } from "@/lib/utils";

interface TrafficClient {
  mac: string;
  description: string | null;
  ip: string | null;
  manufacturer: string | null;
  sent: number;
  recv: number;
  total: number;
}

function clientLabel(c: TrafficClient): string {
  if (c.description) return c.description;
  if (c.manufacturer) return c.manufacturer;
  return c.mac;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 pt-2">
      {[80, 60, 40].map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-24 h-3 rounded bg-white/10 animate-pulse shrink-0" />
          <div
            className="h-5 rounded bg-white/10 animate-pulse"
            style={{ width: `${w}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export function TrafficChart() {
  const { selectedNetwork } = useNetwork();

  const { data, isLoading, isError, error } = useQuery<TrafficClient[]>({
    queryKey: ["traffic", selectedNetwork?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/meraki/traffic?networkId=${selectedNetwork!.id}&timespan=3600`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to load traffic data");
      }
      return res.json() as Promise<TrafficClient[]>;
    },
    enabled: !!selectedNetwork,
    staleTime: 30 * 1000,
  });

  return (
    <div className="rounded-xl border border-white/10 p-5">
      <h2 className="font-semibold mb-4">Top Clients by Bandwidth (last hour)</h2>

      {!selectedNetwork && (
        <p className="text-sm text-white/40">
          Select a network to view traffic.
        </p>
      )}

      {selectedNetwork && isLoading && <LoadingSkeleton />}

      {selectedNetwork && isError && (
        <p className="text-sm text-red-400">
          {error instanceof Error ? error.message : "Failed to load traffic data"}
        </p>
      )}

      {selectedNetwork && data && data.length === 0 && (
        <p className="text-sm text-white/40">No client traffic data available.</p>
      )}

      {selectedNetwork && data && data.length > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data.slice(0, 10).map((c) => ({
              name: clientLabel(c),
              Download: c.recv,
              Upload: c.sent,
            }))}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 8, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }}
              tickFormatter={(v: number) => formatBytes(v)}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#1a1a1a",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontSize: 12,
              }}
              formatter={(value) =>
                typeof value === "number" ? formatBytes(value) : String(value)
              }
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Bar dataKey="Download" fill="#3b82f6" radius={[0, 3, 3, 0]} />
            <Bar dataKey="Upload" fill="#10b981" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
