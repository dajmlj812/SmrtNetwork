"use client";

import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import { Signal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CellularUplinkStatus } from "@/lib/meraki/types";

const STATUS_COLOR: Record<string, string> = {
  active: "text-green-400",
  ready: "text-yellow-400",
  "not connected": "text-red-400",
};

function rsrpBar(rsrp?: string): number {
  // RSRP range: -140 dBm (worst) to -44 dBm (best) → 0–100%
  if (!rsrp) return 0;
  const v = parseFloat(rsrp);
  if (isNaN(v)) return 0;
  return Math.max(0, Math.min(100, ((v + 140) / 96) * 100));
}

function SignalBar({ pct }: { pct: number }) {
  const bars = [25, 50, 75, 100];
  return (
    <div className="flex items-end gap-0.5 h-4">
      {bars.map((threshold, i) => (
        <div
          key={i}
          className={cn(
            "w-1.5 rounded-sm",
            pct >= threshold ? "bg-green-400" : "bg-overlay-strong"
          )}
          style={{ height: `${25 + i * 18}%` }}
        />
      ))}
    </div>
  );
}

export default function CellularPage() {
  const { orgId, selectedNetwork } = useNetwork();

  const { data, isLoading, isError } = useQuery<CellularUplinkStatus[]>({
    queryKey: ["cellular", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/meraki/cellular?orgId=${orgId}`);
      if (!res.ok) throw new Error("Failed to load cellular data");
      return res.json() as Promise<CellularUplinkStatus[]>;
    },
    enabled: !!orgId,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const filtered = selectedNetwork
    ? data?.filter((d) => d.networkId === selectedNetwork.id)
    : data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Signal size={20} className="text-green-400" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground-strong">Cellular Gateways</h1>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted py-8">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading cellular status…</span>
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-400">Failed to load cellular gateway data.</p>
      )}

      {!isLoading && !isError && (!filtered || filtered.length === 0) && (
        <div className="rounded-xl border p-8 text-center text-muted text-sm">
          No cellular gateways found{selectedNetwork ? ` in ${selectedNetwork.name}` : ""}.
        </div>
      )}

      {!isLoading && !isError && filtered && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((device) => (
            <div
              key={device.serial}
              className="rounded-xl border bg-overlay p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{device.model}</p>
                  <p className="text-xs text-muted font-mono">{device.serial}</p>
                </div>
                <span className="text-xs text-faint">
                  {new Date(device.lastReportedAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="space-y-2">
                {device.uplinks.map((uplink, i) => {
                  const rsrp = uplink.signalStat?.rsrp;
                  const rsrq = uplink.signalStat?.rsrq;
                  const pct = rsrpBar(rsrp);
                  const statusKey = uplink.status.toLowerCase();

                  return (
                    <div key={i} className="rounded-lg bg-overlay p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground-muted uppercase">
                          {uplink.interface}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-medium capitalize",
                            STATUS_COLOR[statusKey] ?? "text-muted"
                          )}
                        >
                          {uplink.status}
                        </span>
                      </div>

                      {uplink.provider && (
                        <p className="text-xs text-muted">{uplink.provider}</p>
                      )}

                      {uplink.ip && (
                        <p className="text-xs text-muted font-mono">{uplink.ip}</p>
                      )}

                      {uplink.connectionType && (
                        <p className="text-xs text-muted">{uplink.connectionType}{uplink.signalType ? ` · ${uplink.signalType}` : ""}</p>
                      )}

                      {(rsrp || rsrq) && (
                        <div className="flex items-center gap-3">
                          <SignalBar pct={pct} />
                          <div className="text-[10px] text-muted space-x-2">
                            {rsrp && <span>RSRP {rsrp}</span>}
                            {rsrq && <span>RSRQ {rsrq}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
