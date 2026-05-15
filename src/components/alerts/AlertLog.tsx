"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertLogEntry } from "@/lib/alert-log";
import { toCSV, downloadCSV } from "@/lib/csv";
import { useNetwork } from "@/lib/context/NetworkContext";

const CHANNEL_LABELS: Record<AlertLogEntry["channel"], string> = {
  email: "Email",
  slack: "Slack",
  teams: "Teams",
  webhook: "Webhook",
  servicenow: "ServiceNow",
};

const CHANNEL_COLORS: Record<AlertLogEntry["channel"], string> = {
  email: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  slack: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  teams: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  webhook: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  servicenow: "bg-green-500/20 text-green-300 border-green-500/30",
};

function HealthBadge({ score }: { score: number }) {
  return (
    <span
      className={cn(
        "font-mono font-semibold",
        score < 70 ? "text-red-400" : score < 90 ? "text-yellow-400" : "text-green-400"
      )}
    >
      {score}%
    </span>
  );
}

function handleExportAlertLog(data: AlertLogEntry[]) {
  const rows = data.map((e) => ({
    Timestamp: e.timestamp,
    Network: e.networkName,
    "Health Score": e.healthScore,
    Threshold: e.threshold,
    Channel: e.channel,
    Success: e.success ? "Yes" : "No",
    Error: e.error ?? "",
  }));
  const columns = [
    { key: "Timestamp", header: "Timestamp" },
    { key: "Network", header: "Network" },
    { key: "Health Score", header: "Health Score" },
    { key: "Threshold", header: "Threshold" },
    { key: "Channel", header: "Channel" },
    { key: "Success", header: "Success" },
    { key: "Error", header: "Error" },
  ];
  const date = new Date().toISOString().slice(0, 10);
  downloadCSV(toCSV(rows, columns), `alert-log-${date}.csv`);
}

export function AlertLog() {
  const router = useRouter();
  const { networks, setSelectedNetwork } = useNetwork();

  function handleNetworkClick(networkId: string) {
    const network = networks.find((n) => n.id === networkId);
    if (network) setSelectedNetwork(network);
    router.push("/dashboard");
  }

  const { data, isLoading, isError } = useQuery<AlertLogEntry[]>({
    queryKey: ["alert-log"],
    queryFn: async () => {
      const res = await fetch("/api/alert-log?limit=50");
      if (!res.ok) throw new Error("Failed to load alert log");
      return res.json() as Promise<AlertLogEntry[]>;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return (
    <div className="rounded-xl border border-white/10 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm text-white/60 uppercase tracking-wider">
          Alert History
        </h2>
        {data && data.length > 0 && (
          <button
            type="button"
            onClick={() => handleExportAlertLog(data)}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
            title="Export alert log as CSV"
          >
            <Download size={13} />
            CSV
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-white/50">
          <Loader2 size={15} className="animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-400">Failed to load alert history.</p>
      )}

      {!isLoading && !isError && data?.length === 0 && (
        <p className="text-sm text-white/40">No alerts have fired yet.</p>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/40 uppercase tracking-wider">
                <th className="pb-2 text-left font-medium pr-4">Time</th>
                <th className="pb-2 text-left font-medium pr-4">Network</th>
                <th className="pb-2 text-center font-medium pr-4">Score</th>
                <th className="pb-2 text-center font-medium pr-4">Threshold</th>
                <th className="pb-2 text-center font-medium pr-4">Channel</th>
                <th className="pb-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/2"
                >
                  <td className="py-2.5 pr-4 text-white/60 whitespace-nowrap font-mono text-xs">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4">
                    <button
                      type="button"
                      onClick={() => handleNetworkClick(entry.networkId)}
                      className="text-white/80 hover:text-blue-400 hover:underline transition-colors text-left"
                    >
                      {entry.networkName}
                    </button>
                  </td>
                  <td className="py-2.5 pr-4 text-center">
                    <HealthBadge score={entry.healthScore} />
                  </td>
                  <td className="py-2.5 pr-4 text-center text-white/50 font-mono">
                    {entry.threshold}%
                  </td>
                  <td className="py-2.5 pr-4 text-center">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded-full text-xs border",
                        CHANNEL_COLORS[entry.channel]
                      )}
                    >
                      {CHANNEL_LABELS[entry.channel]}
                    </span>
                  </td>
                  <td className="py-2.5 text-center">
                    {entry.success ? (
                      <CheckCircle
                        size={15}
                        className="text-green-400 inline-block"
                        aria-label="Sent successfully"
                      />
                    ) : (
                      <span
                        title={entry.error ?? "Unknown error"}
                        className="cursor-help"
                      >
                        <XCircle
                          size={15}
                          className="text-red-400 inline-block"
                          aria-label={entry.error ?? "Failed"}
                        />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
