"use client";

import { useEffect, useState } from "react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { formatBytes, cn } from "@/lib/utils";
import type { Client, Device } from "@/lib/meraki/types";
import { Loader2, Wifi, Server, AlertTriangle } from "lucide-react";
import { MarkdownOutput } from "@/components/ui/MarkdownOutput";

interface SearchResult {
  type: "mac" | "ip";
  client: Client | null;
  device: Device | null;
}

interface Props {
  query: string;
}

const STATUS_COLORS: Record<string, string> = {
  online: "bg-green-500",
  offline: "bg-red-500",
  alerting: "bg-yellow-500",
  dormant: "bg-gray-500",
};

export function DeviceDetail({ query }: Props) {
  const { selectedNetwork, orgId } = useNetwork();
  const [result, setResult] = useState<SearchResult | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [diagError, setDiagError] = useState<string | null>(null);

  useEffect(() => {
    if (!query || !selectedNetwork || !orgId) return;

    setResult(null);
    setFetchError(null);
    setAnalysis(null);
    setDiagError(null);
    setFetching(true);

    const params = new URLSearchParams({
      query,
      networkId: selectedNetwork.id,
      orgId,
    });

    fetch(`/api/meraki/search?${params.toString()}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Search failed");
        setResult(data as SearchResult);
      })
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : "Unknown error");
      })
      .finally(() => setFetching(false));
  }, [query, selectedNetwork, orgId]);

  async function diagnose(serial: string) {
    if (!selectedNetwork) return;
    setDiagnosing(true);
    setAnalysis(null);
    setDiagError(null);
    try {
      const res = await fetch("/api/analyze/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial, networkId: selectedNetwork.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Diagnosis failed");
      setAnalysis(data.analysis ?? data.error);
    } catch (err: unknown) {
      setDiagError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDiagnosing(false);
    }
  }

  if (!selectedNetwork) {
    return (
      <div className="rounded-xl border border-white/10 p-5">
        <p className="text-sm text-white/40">
          Select a network from the sidebar before searching.
        </p>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="rounded-xl border border-white/10 p-5 flex items-center gap-2 text-white/50">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Searching for &quot;{query}&quot;…</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 flex items-start gap-2">
        <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-400">Search failed</p>
          <p className="text-xs text-white/50 mt-0.5">{fetchError}</p>
        </div>
      </div>
    );
  }

  if (result && !result.client && !result.device) {
    return (
      <div className="rounded-xl border border-white/10 p-5">
        <p className="text-sm text-white/50">
          No client or device found matching <span className="font-mono text-white/70">{query}</span> in the last 24 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Client Card */}
      {result?.client && (
        <div className="rounded-xl border border-white/10 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Wifi size={16} className="text-blue-400" />
            <h2 className="font-semibold text-sm">Client</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <InfoRow label="MAC" value={result.client.mac} mono />
            <InfoRow label="IP" value={result.client.ip ?? "—"} mono />
            <InfoRow label="Manufacturer" value={result.client.manufacturer ?? "—"} />
            <InfoRow label="OS" value={result.client.os ?? "—"} />
            <InfoRow
              label="SSID"
              value={result.client.ssid ?? "—"}
            />
            <InfoRow label="VLAN" value={result.client.vlan ?? "—"} />
            <InfoRow
              label="Last Seen"
              value={new Date(result.client.lastSeen).toLocaleString()}
            />
            <InfoRow
              label="Recent Device"
              value={result.client.recentDeviceName ?? "—"}
            />
            <InfoRow
              label="Download"
              value={formatBytes(result.client.usage.recv)}
            />
            <InfoRow
              label="Upload"
              value={formatBytes(result.client.usage.sent)}
            />
          </div>
        </div>
      )}

      {/* Device Card */}
      {result?.device && (
        <div className="rounded-xl border border-white/10 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-purple-400" />
              <h2 className="font-semibold text-sm">Device</h2>
            </div>
            <div className="flex items-center gap-2">
              {result.device.status && (
                <span className="flex items-center gap-1.5 text-xs text-white/60">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      STATUS_COLORS[result.device.status] ?? "bg-gray-500"
                    )}
                  />
                  {result.device.status}
                </span>
              )}
              <button
                onClick={() => diagnose(result.device!.serial)}
                disabled={diagnosing}
                className="text-xs px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {diagnosing ? (
                  <span className="flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" />
                    Diagnosing…
                  </span>
                ) : (
                  "AI Diagnose"
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <InfoRow label="Name" value={result.device.name} />
            <InfoRow label="Serial" value={result.device.serial} mono />
            <InfoRow label="Model" value={result.device.model} />
            <InfoRow label="Firmware" value={result.device.firmware} />
            <InfoRow label="MAC" value={result.device.mac} mono />
            {result.device.lanIp && (
              <InfoRow label="LAN IP" value={result.device.lanIp} mono />
            )}
            {result.device.wan1Ip && (
              <InfoRow label="WAN1 IP" value={result.device.wan1Ip} mono />
            )}
            {result.device.wan2Ip && (
              <InfoRow label="WAN2 IP" value={result.device.wan2Ip} mono />
            )}
          </div>

          {diagError && (
            <p className="text-xs text-red-400">{diagError}</p>
          )}

          {analysis && (
            <div className="mt-2 border-t border-white/10 pt-3">
              <MarkdownOutput content={analysis} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="text-xs text-white/40">{label}</span>
      <p className={cn("text-sm text-white/80 mt-0.5", mono && "font-mono text-xs")}>
        {value}
      </p>
    </div>
  );
}
