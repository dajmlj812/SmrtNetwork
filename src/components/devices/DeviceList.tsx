"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";
import type { Device, Client } from "@/lib/meraki/types";
import { Loader2, AlertTriangle, Download } from "lucide-react";
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
  online: "bg-green-500",
  offline: "bg-red-500",
  alerting: "bg-yellow-500",
  dormant: "bg-gray-500",
};

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-white/10 rounded animate-pulse" />
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

  async function runDiagnosis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial: device.serial, networkId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Diagnosis failed");
      setAnalysis((data as { analysis?: string }).analysis ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

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

  // Auto-run on mount
  if (!analysis && !loading && !error) {
    void runDiagnosis();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">{device.name || device.serial}</h2>
            <p className="text-xs text-white/40">{device.model} · {device.serial}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-white/50">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Diagnosing device…</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {analysis && (
          <>
            <MarkdownOutput content={analysis} />
            <div className="flex items-center gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleCreateJira}
                disabled={creatingJira}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/30 disabled:opacity-40 transition-colors"
              >
                {creatingJira && <Loader2 size={12} className="animate-spin" />}
                {creatingJira ? "Creating…" : "Create Jira Issue"}
              </button>
              {jiraResult && (
                <span className={cn("text-xs", jiraResult.ok ? "text-green-400" : "text-red-400")}>
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

  // Merge status into devices
  const statusMap = new Map<string, Device["status"]>();
  if (statuses) {
    for (const s of statuses) {
      statusMap.set(s.serial, s.status);
    }
  }

  // Count clients per device MAC
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

  // Sort: alerting → offline → online → dormant → undefined
  merged.sort((a, b) => {
    const ao = STATUS_ORDER[a.status ?? ""] ?? 4;
    const bo = STATUS_ORDER[b.status ?? ""] ?? 4;
    return ao - bo;
  });

  return (
    <>
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-sm">Devices</h2>
            {selectedNetwork && (
              <p className="text-xs text-white/40 mt-0.5">{selectedNetwork.name}</p>
            )}
          </div>
          {merged.length > 0 && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
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
              <tr className="border-b border-white/5">
                <th className="px-4 py-2 text-left text-xs text-white/40 font-medium">Status</th>
                <th className="px-4 py-2 text-left text-xs text-white/40 font-medium">Name</th>
                <th className="px-4 py-2 text-left text-xs text-white/40 font-medium">Model</th>
                <th className="px-4 py-2 text-left text-xs text-white/40 font-medium">LAN IP</th>
                <th className="px-4 py-2 text-left text-xs text-white/40 font-medium">WAN IP</th>
                <th className="px-4 py-2 text-left text-xs text-white/40 font-medium">Clients</th>
                <th className="px-4 py-2 text-left text-xs text-white/40 font-medium">Firmware</th>
                <th className="px-4 py-2 text-left text-xs text-white/40 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : merged.map((device) => (
                    <tr
                      key={device.serial}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full inline-block",
                            STATUS_DOT[device.status ?? ""] ?? "bg-gray-600"
                          )}
                          title={device.status ?? "unknown"}
                        />
                      </td>
                      <td className="px-4 py-3 text-white/80 font-medium">
                        {device.name || device.serial}
                      </td>
                      <td className="px-4 py-3 text-white/60 font-mono text-xs">
                        {device.model}
                      </td>
                      <td className="px-4 py-3 text-white/60 font-mono text-xs">
                        {device.lanIp ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-white/60 font-mono text-xs">
                        {device.wan1Ip ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-white/60">
                        {device.clientCount}
                      </td>
                      <td className="px-4 py-3 text-white/50 font-mono text-xs">
                        {device.firmware}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDiagDevice(device)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors"
                        >
                          AI Diagnose
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
