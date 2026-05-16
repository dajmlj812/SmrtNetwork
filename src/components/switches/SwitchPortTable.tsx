"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";
import type { SwitchData, SwitchStreamEvent } from "@/app/api/meraki/switches/route";
import type { SwitchPort, SwitchPortStatus } from "@/lib/meraki/types";

interface StreamState {
  switches: SwitchData[];
  loaded: number;
  total: number;
  failed: { serial: string; message: string }[];
  done: boolean;
  error: string | null;
}

function useSwitchStream(networkId: string | undefined): StreamState {
  const [state, setState] = useState<StreamState>({
    switches: [],
    loaded: 0,
    total: 0,
    failed: [],
    done: false,
    error: null,
  });

  useEffect(() => {
    if (!networkId) {
      setState({ switches: [], loaded: 0, total: 0, failed: [], done: false, error: null });
      return;
    }

    setState({ switches: [], loaded: 0, total: 0, failed: [], done: false, error: null });

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/meraki/switches?networkId=${networkId}`, {
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone || cancelled) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            let event: SwitchStreamEvent;
            try {
              event = JSON.parse(trimmed) as SwitchStreamEvent;
            } catch {
              continue;
            }

            setState((prev) => {
              switch (event.type) {
                case "start":
                  return { ...prev, total: event.total };
                case "switch":
                  return {
                    ...prev,
                    switches: [...prev.switches, event.data],
                    loaded: prev.loaded + 1,
                  };
                case "error":
                  return {
                    ...prev,
                    failed: [...prev.failed, { serial: event.serial, message: event.message }],
                    loaded: prev.loaded + 1,
                  };
                case "done":
                  return { ...prev, done: true };
                case "fatal":
                  return { ...prev, done: true, error: event.message };
                default:
                  return prev;
              }
            });
          }
        }
      } catch (err) {
        if (!cancelled && (err as Error).name !== "AbortError") {
          setState((prev) => ({
            ...prev,
            done: true,
            error: err instanceof Error ? err.message : "Stream failed",
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [networkId]);

  return state;
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
    <div className="rounded-xl border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-overlay hover:bg-overlay-strong transition-colors text-left"
      >
        {expanded ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
        <span className="font-semibold text-sm">{sw.name}</span>
        <span className="text-xs text-muted">{sw.model}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
            {connectedCount} connected
          </span>
          <span className="text-xs bg-overlay-strong text-muted px-2 py-0.5 rounded-full">
            {disconnectedCount} disconnected
          </span>
        </div>
      </button>

      {/* Table */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted">
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
                      "border-b hover:bg-overlay transition-colors",
                      isDisconnectedNonUplink && "bg-red-500/5"
                    )}
                  >
                    <td className="px-3 py-2 font-mono text-foreground-muted">{port.portId}</td>
                    <td className="px-3 py-2 text-foreground">{port.name || <span className="text-faint">—</span>}</td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full inline-block",
                            isConnected ? "bg-accent" : "bg-overlay-strong"
                          )}
                        />
                        <span className={isConnected ? "text-foreground" : "text-faint"}>
                          {status?.status ?? "Unknown"}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-foreground-muted">{status?.speed ?? "—"}</td>
                    <td className="px-3 py-2 text-foreground-muted">{port.vlan}</td>
                    <td className="px-3 py-2 text-foreground-muted">
                      {status?.powerUsageInWh != null
                        ? status.powerUsageInWh.toFixed(1)
                        : port.poeEnabled
                        ? <span className="text-faint">PoE</span>
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-foreground-muted">{status?.clientCount ?? "—"}</td>
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
  const { switches, loaded, total, failed, done, error } = useSwitchStream(selectedNetwork?.id);

  if (!selectedNetwork) {
    return (
      <div className="text-sm text-muted text-center py-12">
        Select a network to view switch ports.
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500 dark:text-red-400">
        Failed to load switch data: {error}
      </div>
    );
  }

  // Show centered loader before stream "start" event arrives (i.e. total still 0)
  if (!done && total === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 flex items-center justify-center gap-2 text-muted">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Discovering switches…</span>
      </div>
    );
  }

  if (done && total === 0) {
    return (
      <div className="text-sm text-muted text-center py-12">
        No MS switches found in this network.
      </div>
    );
  }

  // Sort: by name once present
  const sortedSwitches = [...switches].sort((a, b) =>
    (a.name ?? a.serial).localeCompare(b.name ?? b.serial)
  );

  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Live progress bar — disappears when done */}
      {!done && (
        <div className="rounded-xl border bg-card px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-foreground-muted">
              <Loader2 size={12} className="animate-spin text-accent" />
              <span>
                Loading switches —{" "}
                <span className="font-semibold text-foreground-strong tabular-nums">
                  {loaded}
                </span>{" "}
                of <span className="tabular-nums">{total}</span>
              </span>
            </div>
            <span className="text-muted tabular-nums">{pct}%</span>
          </div>
          <div className="h-1 rounded-full bg-overlay-strong overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Soft notice if some switches failed */}
      {done && failed.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-300">
          {failed.length} switch{failed.length === 1 ? "" : "es"} failed to load (likely rate-limited). Refresh to retry.
        </div>
      )}

      {sortedSwitches.map((sw) => (
        <SwitchSection key={sw.serial} sw={sw} />
      ))}
    </div>
  );
}
