"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";
import type { VpnStatus, VpnPeer } from "@/lib/meraki/types";

function SummaryBar({ vpnData }: { vpnData: VpnStatus[] }) {
  const hubs = vpnData.filter((v) => v.vpnMode === "hub").length;
  const spokes = vpnData.filter((v) => v.vpnMode === "spoke").length;
  const unreachable = vpnData.reduce((acc, v) => {
    const unreachablePeers = (v.merakiVpnPeers ?? []).filter(
      (p) => p.reachability === "unreachable"
    ).length;
    return acc + unreachablePeers;
  }, 0);

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-white/60">
        <span className="font-semibold text-white">{hubs}</span> hub{hubs !== 1 ? "s" : ""}
      </span>
      <span className="text-white/60">
        <span className="font-semibold text-white">{spokes}</span> spoke{spokes !== 1 ? "s" : ""}
      </span>
      {unreachable > 0 ? (
        <span className="text-red-400">
          <span className="font-semibold">{unreachable}</span> unreachable tunnel{unreachable !== 1 ? "s" : ""}
        </span>
      ) : (
        <span className="text-green-400">All tunnels reachable</span>
      )}
    </div>
  );
}

function VpnRow({ vpn }: { vpn: VpnStatus }) {
  const [expanded, setExpanded] = useState(false);
  const peers = vpn.merakiVpnPeers ?? [];
  const unreachable = peers.filter((p) => p.reachability === "unreachable").length;

  return (
    <>
      <tr
        className={cn(
          "border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer",
          unreachable > 0 && "bg-red-500/5"
        )}
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="px-4 py-3 text-sm">{vpn.networkName}</td>
        <td className="px-4 py-3 text-sm font-mono text-white/60">{vpn.deviceSerial}</td>
        <td className="px-4 py-3 text-sm text-white/60">{vpn.deviceModel}</td>
        <td className="px-4 py-3 text-sm">
          <span className={cn(
            "px-2 py-0.5 rounded text-xs",
            vpn.vpnMode === "hub"
              ? "bg-purple-500/20 text-purple-300"
              : "bg-blue-500/20 text-blue-300"
          )}>
            {vpn.vpnMode}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-white/60">
          {peers.length > 0 ? (
            <span className={cn(unreachable > 0 && "text-red-400")}>
              {peers.length} ({unreachable} unreachable)
            </span>
          ) : "—"}
        </td>
        <td className="px-4 py-3 text-sm">
          <span className={cn(
            "flex items-center gap-1",
            vpn.deviceStatus === "online" ? "text-green-400" : "text-red-400"
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full inline-block",
              vpn.deviceStatus === "online" ? "bg-green-500" : "bg-red-500"
            )} />
            {vpn.deviceStatus}
          </span>
        </td>
        <td className="px-4 py-3">
          {peers.length > 0 && (
            expanded
              ? <ChevronDown size={14} className="text-white/30" />
              : <ChevronRight size={14} className="text-white/30" />
          )}
        </td>
      </tr>
      {expanded && peers.length > 0 && (
        <tr className="border-b border-white/5">
          <td colSpan={7} className="px-4 pb-3 pt-1">
            <div className="pl-4 space-y-1">
              {peers.map((peer: VpnPeer) => (
                <div
                  key={peer.networkId}
                  className="flex items-center gap-3 text-xs"
                >
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    peer.reachability === "reachable" ? "bg-green-500" : "bg-red-500"
                  )} />
                  <span className="text-white/70">{peer.networkName}</span>
                  <span className={cn(
                    "text-xs",
                    peer.reachability === "reachable" ? "text-green-400" : "text-red-400"
                  )}>
                    {peer.reachability}
                  </span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function VpnTable() {
  const { orgId } = useNetwork();

  const { data, isLoading, error } = useQuery<VpnStatus[]>({
    queryKey: ["vpn", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/meraki/vpn?orgId=${orgId}`);
      if (!res.ok) throw new Error("Failed to fetch VPN data");
      return res.json() as Promise<VpnStatus[]>;
    },
    staleTime: 2 * 60_000,
    refetchInterval: 2 * 60_000,
    enabled: !!orgId,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
        Failed to load VPN data: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-white/40 text-center py-12">
        No VPN-enabled appliances found in this organization.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SummaryBar vpnData={data} />
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/40">
                <th className="px-4 py-3 text-left font-medium">Network</th>
                <th className="px-4 py-3 text-left font-medium">Device</th>
                <th className="px-4 py-3 text-left font-medium">Model</th>
                <th className="px-4 py-3 text-left font-medium">Mode</th>
                <th className="px-4 py-3 text-left font-medium">Peers</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((vpn) => (
                <VpnRow key={vpn.deviceSerial} vpn={vpn} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
