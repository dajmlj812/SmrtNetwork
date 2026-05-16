"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";
import type { Device, Client } from "@/lib/meraki/types";
import { Loader2, AlertTriangle, Download, Sparkles, X } from "lucide-react";
import { toCSV, downloadCSV } from "@/lib/csv";
import { MarkdownOutput } from "@/components/ui/MarkdownOutput";

interface MergedDevice extends Device {
  clientCount: number;
}

const STATUS_ORDER: Record<string, number> = {
  alerting: 0,
  offline: 1,
  online: 2,
  dormant: 3,
};

const STATUS_DOT: Record<string, string> = {
  online:   "bg-accent",
  offline:  "bg-red-500",
  alerting: "bg-yellow-500",
  dormant:  "bg-muted",
};

const STATUS_ROW_TINT: Record<string, string> = {
  alerting: "bg-yellow-500/[0.04]",
  offline:  "bg-red-500/[0.04]",
};

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-overlay-strong rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

interface DiagnoseModalProps {
  device: MergedDevice;
  networkId: string;
  onClose: () => void;
}

function DiagnoseModal({ device, networkId, onClose }: DiagnoseModalProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingJira, setCreatingJira] = useState(false);
  const [jiraResult, setJiraResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAnalysis(null);

    fetch("/api/analyze/device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serial: device.serial, networkId }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Diagnosis failed");
        if (!cancelled) setAnalysis((data as { analysis?: string }).analysis ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [device.serial, networkId]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleCreateJira() {
    setCreatingJira(true);
    setJiraResult(null);
    try {
      const res = await fetch("/api/integrations/jira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceName: device.name || device.serial,
          deviceSerial: device.serial,
          deviceModel: device.model,
          networkName: networkId,
          status: device.status ?? "unknown",
          analysis: analysis ?? undefined,
        }),
      });
      const data = await res.json() as { success?: boolean; issueKey?: string; issueUrl?: string; error?: string };
      if (data.success) {
        setJiraResult({ ok: true, message: data.issueKey ? `Created ${data.issueKey}` : "Issue created" });
      } else {
        setJiraResult({ ok: false, message: data.error ?? "Failed to create issue" });
      }
    } catch (err) {
      setJiraResult({ ok: false, message: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setCreatingJira(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-card border rounded-xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="mt-0.5 p-1.5 rounded-lg bg-accent-soft border border-accent/30">
              <Sparkles size={14} className="text-accent" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground-strong truncate">
                {device.name || device.serial}
              </h2>
              <p className="text-xs text-muted font-mono truncate">
                {device.model} · {device.serial}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-foreground-strong hover:bg-overlay-strong transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Diagnosing device…</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-500 dark:text-red-400 text-sm">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {analysis && (
          <>
            <MarkdownOutput content={analysis} />
            <div className="flex items-center gap-3 pt-2 border-t">
              <button
                type="button"
                onClick={handleCreateJira}
                disabled={creatingJira}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border text-foreground-muted hover:text-foreground-strong hover:border-strong disabled:opacity-40 transition-colors"
              >
                {creatingJira && <Loader2 size={12} className="animate-spin" />}
                {creatingJira ? "Creating…" : "Create Jira Issue"}
              </button>
              {jiraResult && (
                <span className={cn("text-xs", jiraResult.ok ? "text-accent" : "text-red-500 dark:text-red-400")}>
                  {jiraResult.message}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function DeviceList() {
  const { selectedNetwork, orgId } = useNetwork();
  const [diagDevice, setDiagDevice] = useState<MergedDevice | null>(null);

  const { data: devices, isLoading: loadingDevices } = useQuery<Device[]>({
    queryKey: ["devices-list", selectedNetwork?.id],
    queryFn: async () => {
      const res = await fetch(`/api/meraki/devices?networkId=${selectedNetwork!.id}`);
      if (!res.ok) throw new Error("Failed to load devices");
      return res.json() as Promise<Device[]>;
    },
    enabled: !!selectedNetwork,
    staleTime: 60_000,
  });

  const { data: statuses, isLoading: loadingStatuses } = useQuery<Device[]>({
    queryKey: ["device-statuses", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/meraki/devices?orgId=${orgId}`);
      if (!res.ok) throw new Error("Failed to load device statuses");
      return res.json() as Promise<Device[]>;
    },
    enabled: !!selectedNetwork,
    staleTime: 60_000,
  });

  const { data: clients, isLoading: loadingClients } = useQuery<Client[]>({
    queryKey: ["clients-list", selectedNetwork?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/meraki/clients?networkId=${selectedNetwork!.id}&timespan=3600`
      );
      if (!res.ok) throw new Error("Failed to load clients");
      return res.json() as Promise<Client[]>;
    },
    enabled: !!selectedNetwork,
    staleTime: 60_000,
  });

  function handleExportCSV() {
    const rows = merged.map((d) => ({
      Name: d.name || d.serial,
      Serial: d.serial,
      Model: d.model,
      Status: d.status ?? "",
      "LAN IP": d.lanIp ?? "",
      "WAN IP": d.wan1Ip ?? "",
      Clients: d.clientCount,
      Firmware: d.firmware,
    }));
    const columns = [
      { key: "Name", header: "Name" },
      { key: "Serial", header: "Serial" },
      { key: "Model", header: "Model" },
      { key: "Status", header: "Status" },
      { key: "LAN IP", header: "LAN IP" },
      { key: "WAN IP", header: "WAN IP" },
      { key: "Clients", header: "Clients" },
      { key: "Firmware", header: "Firmware" },
    ];
    const date = new Date().toISOString().slice(0, 10);
    const filename = `devices-${selectedNetwork?.name ?? "network"}-${date}.csv`;
    downloadCSV(toCSV(rows, columns), filename);
  }

  if (!selectedNetwork) return null;

  const isLoading = loadingDevices || loadingStatuses || loadingClients;

  const statusMap = new Map<string, Device["status"]>();
  if (statuses) {
    for (const s of statuses) {
      statusMap.set(s.serial, s.status);
    }
  }

  const clientCountMap = new Map<string, number>();
  if (clients) {
    for (const c of clients) {
      if (c.recentDeviceMac) {
        clientCountMap.set(
          c.recentDeviceMac,
          (clientCountMap.get(c.recentDeviceMac) ?? 0) + 1
        );
      }
    }
  }

  const merged: MergedDevice[] = (devices ?? []).map((d) => ({
    ...d,
    status: statusMap.get(d.serial) ?? d.status,
    clientCount: clientCountMap.get(d.mac) ?? 0,
  }));

  merged.sort((a, b) => {
    const ao = STATUS_ORDER[a.status ?? ""] ?? 4;
    const bo = STATUS_ORDER[b.status ?? ""] ?? 4;
    return ao - bo;
  });

  return (
    <>
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-sm text-foreground-strong">Devices</h2>
            <p className="text-xs text-muted mt-0.5">{selectedNetwork.name}</p>
          </div>
          {merged.length > 0 && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1 text-xs text-muted hover:text-foreground-strong transition-colors"
              title="Export devices as CSV"
            >
              <Download size={13} />
              CSV
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-overlay/50">
                <th className="px-4 py-2.5 text-left text-[11px] text-muted font-semibold uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-left text-[11px] text-muted font-semibold uppercase tracking-wider">Name</th>
                <th className="px-4 py-2.5 text-left text-[11px] text-muted font-semibold uppercase tracking-wider">Model</th>
                <th className="px-4 py-2.5 text-left text-[11px] text-muted font-semibold uppercase tracking-wider">LAN IP</th>
                <th className="px-4 py-2.5 text-left text-[11px] text-muted font-semibold uppercase tracking-wider">WAN IP</th>
                <th className="px-4 py-2.5 text-right text-[11px] text-muted font-semibold uppercase tracking-wider">Clients</th>
                <th className="px-4 py-2.5 text-left text-[11px] text-muted font-semibold uppercase tracking-wider">Firmware</th>
                <th className="px-4 py-2.5 text-left text-[11px] text-muted font-semibold uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : merged.map((device) => (
                    <tr
                      key={device.serial}
                      className={cn(
                        "border-b last:border-0 hover:bg-overlay transition-colors",
                        STATUS_ROW_TINT[device.status ?? ""]
                      )}
                    >
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "w-2.5 h-2.5 rounded-full inline-block ring-2 ring-card",
                            STATUS_DOT[device.status ?? ""] ?? "bg-overlay-strong"
                          )}
                          title={device.status ?? "unknown"}
                        />
                      </td>
                      <td className="px-4 py-3 text-foreground-strong font-medium">
                        {device.name || device.serial}
                      </td>
                      <td className="px-4 py-3 text-muted font-mono text-xs">
                        {device.model}
                      </td>
                      <td className="px-4 py-3 text-foreground-muted font-mono text-xs">
                        {device.lanIp ?? <span className="text-faint">—</span>}
                      </td>
                      <td className="px-4 py-3 text-foreground-muted font-mono text-xs">
                        {device.wan1Ip ?? <span className="text-faint">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground tabular-nums">
                        {device.clientCount}
                      </td>
                      <td className="px-4 py-3 text-muted font-mono text-xs">
                        {device.firmware}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDiagDevice(device)}
                          className="text-xs px-2.5 py-1 rounded-lg border text-foreground-muted hover:text-accent hover:border-accent/50 transition-colors flex items-center gap-1"
                        >
                          <Sparkles size={11} />
                          Diagnose
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {diagDevice && selectedNetwork && (
        <DiagnoseModal
          device={diagDevice}
          networkId={selectedNetwork.id}
          onClose={() => setDiagDevice(null)}
        />
      )}
    </>
  );
}
