"use client";

import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import type { AlertSettings } from "@/lib/meraki/types";

async function fetchAlertSettings(networkId: string): Promise<AlertSettings> {
  const res = await fetch(`/api/meraki/alerts?networkId=${networkId}`);
  if (!res.ok) throw new Error("Failed to fetch alert settings");
  return res.json();
}

export function AlertsSummary() {
  const { selectedNetwork } = useNetwork();

  const { data, isLoading } = useQuery({
    queryKey: ["alerts", selectedNetwork?.id],
    queryFn: () => fetchAlertSettings(selectedNetwork!.id),
    enabled: !!selectedNetwork,
    staleTime: 60 * 1000,
  });

  const enabled = data?.alerts.filter((a) => a.enabled) ?? [];
  const disabled = data?.alerts.filter((a) => !a.enabled) ?? [];

  return (
    <div className="rounded-xl border border-white/10 p-5 space-y-3">
      <h2 className="font-semibold">Alert Profiles</h2>

      {!selectedNetwork && (
        <p className="text-sm text-white/40">Select a network to view alerts.</p>
      )}
      {isLoading && <p className="text-sm text-white/40">Loading…</p>}

      {data && (
        <>
          <div className="space-y-1.5">
            {enabled.map((a) => (
              <div key={a.type} className="flex items-center gap-2 text-xs text-white/80">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                {a.type}
              </div>
            ))}
            {disabled.map((a) => (
              <div key={a.type} className="flex items-center gap-2 text-xs text-white/30">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                {a.type}
              </div>
            ))}
          </div>
          <p className="text-xs text-white/30">
            {enabled.length} of {data.alerts.length} enabled
          </p>
        </>
      )}
    </div>
  );
}
