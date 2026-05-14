"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";
import type { SwitchData } from "@/app/api/meraki/switches/route";
import type { SwitchPort, SwitchPortStatus } from "@/lib/meraki/types";

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-white/5">
          {Array.from({ length: 8 }).map((__, j) => (
            <td key={j} className="px-3 py-2">
              <div className="h-3 bg-white/10 rounded animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function SwitchSection({ sw }: { sw: SwitchData }) {
  const [expanded, setExpanded] = useState(true);

  // Merge port config with status
  const statusMap = new Map<string, SwitchPortStatus>(
    sw.statuses.map((s) => [s.portId, s])
  );

  // Sort: uplinks first, then connected, then disconnected
  const sortedPorts = [...sw.ports].sort((a, b) => {
    const sa = statusMap.get(a.portId);
    const sb = statusMap.get(b.portId);
    const aUp = sa?.isUplink ? 0 : 1;
    const bUp = sb?.isUplink ? 0 : 1;
    if (aUp !== bUp) return aUp - bUp;
    const aConn = sa?.status === "Connected" ? 0 : 1;
    const bConn = sb?.status === "Connected" ? 0 : 1;
    return aConn - bConn;
  });

  const connectedCount = sw.statuses.filter((s) => s.status === "Connected").length;
  const disconnectedCount = sw.statuses.filter((s) => s.status !== "Connected").length;

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/8 transition-colors text-left"
      >
        {expanded ? <ChevronDown size={16} className="text-white/50" /> : <ChevronRight size={16} className="text-white/50" />}
        <span className="font-semibold text-sm">{sw.name}</span>
        <span className="text-xs text-white/40">{sw.model}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
            {connectedCount} connected
          </span>
          <span className="text-xs bg-white/10 text-white/40 px-2 py-0.5 rounded-full">
            {disconnectedCount} disconnected
          </span>
        </div>
      </button>

      {/* Table */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/40">
                <th className="px-3 py-2 text-left font-medium">Port</th>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Speed</th>
                <th className="px-3 py-2 text-left font-medium">VLAN</th>
                <th className="px-3 py-2 text-left font-medium">PoE (W)</th>
                <th className="px-3 py-2 text-left font-medium">Clients</th>
                <th className="px-3 py-2 text-left font-medium">Uplink</th>
              </tr>
            </thead>
            <tbody>
              {sortedPorts.map((port: SwitchPort) => {
                const status = statusMap.get(port.portId);
                const isConnected = status?.status === "Connected";
                const isUplink = status?.isUplink ?? false;
                const isDisconnectedNonUplink = !isConnected && !isUplink;

                return (
                  <tr
                    key={port.portId}
                    className={cn(
                      "border-b border-white/5 hover:bg-white/3 transition-colors",
                      isDisconnectedNonUplink && "bg-red-500/5"
                    )}
                  >
                    <td className="px-3 py-2 font-mono text-white/70">{port.portId}</td>
                    <td className="px-3 py-2 text-white/80">{port.name || <span className="text-white/20">—</span>}</td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full inline-block",
                            isConnected ? "bg-green-500" : "bg-white/20"
                          )}
                        />
                        <span className={isConnected ? "text-white/80" : "text-white/30"}>
                          {status?.status ?? "Unknown"}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-white/60">{status?.speed ?? "—"}</td>
                    <td className="px-3 py-2 text-white/60">{port.vlan}</td>
                    <td className="px-3 py-2 text-white/60">
                      {status?.powerUsageInWh != null
                        ? status.powerUsageInWh.toFixed(1)
                        : port.poeEnabled
                        ? <span className="text-white/30">PoE</span>
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-white/60">{status?.clientCount ?? "—"}</td>
                    <td className="px-3 py-2">
                      {isUplink && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                          &#8679; uplink
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SwitchPortTable() {
  const { selectedNetwork } = useNetwork();

  const { data, isLoading, error } = useQuery<SwitchData[]>({
    queryKey: ["switches", selectedNetwork?.id],
    queryFn: async () => {
      const res = await fetch(`/api/meraki/switches?networkId=${selectedNetwork!.id}`);
      if (!res.ok) throw new Error("Failed to fetch switch data");
      return res.json() as Promise<SwitchData[]>;
    },
    staleTime: 2 * 60_000,
    enabled: !!selectedNetwork?.id,
  });

  if (!selectedNetwork) {
    return (
      <div className="text-sm text-white/40 text-center py-12">
        Select a network to view switch ports.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 bg-white/5 h-10 animate-pulse" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/40">
                {["Port", "Name", "Status", "Speed", "VLAN", "PoE (W)", "Clients", "Uplink"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <SkeletonRows />
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
        Failed to load switch data: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-white/40 text-center py-12">
        No MS switches found in this network.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((sw) => (
        <SwitchSection key={sw.serial} sw={sw} />
      ))}
    </div>
  );
}
