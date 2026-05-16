"use client";

import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import { Bell } from "lucide-react";
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
    <div className="rounded-xl border bg-card p-5 space-y-3 h-full">
      <div className="flex items-center gap-2">
        <Bell size={14} className="text-accent" />
        <h2 className="font-semibold text-foreground-strong">Alert Profiles</h2>
      </div>

      {!selectedNetwork && (
        <p className="text-sm text-muted">Select a network to view alerts.</p>
      )}
      {isLoading && (
        <div className="space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-3 w-32 bg-overlay-strong rounded animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {enabled.map((a) => (
              <div key={a.type} className="flex items-center gap-2 text-xs text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                {a.type}
              </div>
            ))}
            {disabled.map((a) => (
              <div key={a.type} className="flex items-center gap-2 text-xs text-faint">
                <span className="w-1.5 h-1.5 rounded-full bg-overlay-strong shrink-0" />
                {a.type}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted pt-2 border-t">
            <span className="text-foreground-strong font-semibold">{enabled.length}</span>
            {" "}of {data.alerts.length} enabled
          </p>
        </>
      )}
    </div>
  );
}
