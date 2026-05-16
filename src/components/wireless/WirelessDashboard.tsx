"use client";

import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";
import type { WirelessResponse } from "@/app/api/meraki/wireless/route";
import type { ChannelUtilization, WirelessConnectionStats } from "@/lib/meraki/types";

function SsidCard({ name, authMode, encryptionMode, wpaEncryptionMode, visible }: {
  name: string;
  authMode: string;
  encryptionMode?: string;
  wpaEncryptionMode?: string;
  visible?: boolean;
}) {
  return (
    <div className="rounded-xl border p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-sm">{name}</span>
        <span className={cn(
          "text-xs px-1.5 py-0.5 rounded",
          visible === false
            ? "bg-overlay-strong text-muted"
            : "bg-green-500/20 text-green-400"
        )}>
          {visible === false ? "Hidden" : "Visible"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">{authMode}</span>
        {encryptionMode && (
          <span className="text-xs bg-overlay-strong text-muted px-1.5 py-0.5 rounded">{encryptionMode}</span>
        )}
        {wpaEncryptionMode && (
          <span className="text-xs bg-overlay-strong text-muted px-1.5 py-0.5 rounded">{wpaEncryptionMode}</span>
        )}
      </div>
    </div>
  );
}

function ConnectionPipeline({ stats }: { stats: WirelessConnectionStats }) {
  const steps: { label: string; key: keyof WirelessConnectionStats }[] = [
    { label: "Assoc", key: "assoc" },
    { label: "Auth", key: "auth" },
    { label: "DHCP", key: "dhcp" },
    { label: "DNS", key: "dns" },
    { label: "Success", key: "success" },
  ];

  const max = (stats.assoc ?? 0) || 1;

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground-muted">Connection Pipeline (last 1h)</h3>
      <div className="flex items-end gap-2">
        {steps.map((step, i) => {
          const val = stats[step.key] ?? 0;
          const prev = i === 0 ? max : (stats[steps[i - 1].key] ?? 0);
          const pct = Math.round((val / max) * 100);
          const dropRatio = prev > 0 ? val / prev : 1;
          const barColor = i === 0
            ? "bg-blue-500"
            : dropRatio >= 0.95
            ? "bg-green-500"
            : dropRatio >= 0.80
            ? "bg-yellow-500"
            : "bg-red-500";

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-foreground-muted">{val.toLocaleString()}</span>
              <div className="w-full bg-overlay-strong rounded-t overflow-hidden" style={{ height: 60 }}>
                <div
                  className={cn("w-full rounded-t transition-all", barColor)}
                  style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                />
              </div>
              <span className="text-xs text-muted text-center leading-tight">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChannelUtilizationCard({ ap }: { ap: ChannelUtilization }) {
  function avgUtil(band?: { utilizationTotal?: number }[]) {
    if (!band || band.length === 0) return null;
    const vals = band.map((b) => b.utilizationTotal ?? 0);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  const util24 = avgUtil(ap.wifi0);
  const util5 = avgUtil(ap.wifi1);

  if (util24 === null && util5 === null) return null;

  function barColor(u: number) {
    if (u < 50) return "bg-green-500";
    if (u < 75) return "bg-yellow-500";
    return "bg-red-500";
  }

  return (
    <div className="rounded-xl border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-foreground-muted truncate">{ap.serial}</span>
        <span className="text-xs text-muted">{ap.model}</span>
      </div>
      {util24 !== null && (
        <div className="space-y-0.5">
          <div className="flex justify-between text-xs text-muted">
            <span>2.4 GHz</span>
            <span>{util24}%</span>
          </div>
          <div className="h-1.5 bg-overlay-strong rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full", barColor(util24))} style={{ width: `${util24}%` }} />
          </div>
        </div>
      )}
      {util5 !== null && (
        <div className="space-y-0.5">
          <div className="flex justify-between text-xs text-muted">
            <span>5 GHz</span>
            <span>{util5}%</span>
          </div>
          <div className="h-1.5 bg-overlay-strong rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full", barColor(util5))} style={{ width: `${util5}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export function WirelessDashboard() {
  const { selectedNetwork } = useNetwork();

  const { data, isLoading, error } = useQuery<WirelessResponse>({
    queryKey: ["wireless", selectedNetwork?.id],
    queryFn: async () => {
      const res = await fetch(`/api/meraki/wireless?networkId=${selectedNetwork!.id}`);
      if (!res.ok) throw new Error("Failed to fetch wireless data");
      return res.json() as Promise<WirelessResponse>;
    },
    staleTime: 2 * 60_000,
    enabled: !!selectedNetwork?.id,
  });

  if (!selectedNetwork) {
    return (
      <div className="text-sm text-muted text-center py-12">
        Select a network to view wireless health.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 h-24 animate-pulse bg-overlay" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
        Failed to load wireless data: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  if (!data || !data.supported) {
    return (
      <div className="text-sm text-muted text-center py-12">
        This network does not have wireless access points.
      </div>
    );
  }

  // Group channel utilization by model
  const apsByModel = new Map<string, ChannelUtilization[]>();
  for (const ap of data.channelUtilization) {
    const arr = apsByModel.get(ap.model) ?? [];
    arr.push(ap);
    apsByModel.set(ap.model, arr);
  }

  return (
    <div className="space-y-6">
      {/* SSIDs */}
      <div>
        <h2 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-3">
          Active SSIDs ({data.ssids.length})
        </h2>
        {data.ssids.length === 0 ? (
          <p className="text-sm text-muted">No enabled SSIDs found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.ssids.map((ssid) => (
              <SsidCard
                key={ssid.number}
                name={ssid.name}
                authMode={ssid.authMode}
                encryptionMode={ssid.encryptionMode}
                wpaEncryptionMode={ssid.wpaEncryptionMode}
                visible={ssid.visible}
              />
            ))}
          </div>
        )}
      </div>

      {/* Connection Stats */}
      {data.connectionStats && (
        <ConnectionPipeline stats={data.connectionStats} />
      )}

      {/* Channel Utilization */}
      {data.channelUtilization.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-3">
            Channel Utilization (last 1h avg)
          </h2>
          {Array.from(apsByModel.entries()).map(([model, aps]) => (
            <div key={model} className="mb-4">
              <h3 className="text-xs text-muted mb-2">{model}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {aps.map((ap) => (
                  <ChannelUtilizationCard key={ap.serial} ap={ap} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
