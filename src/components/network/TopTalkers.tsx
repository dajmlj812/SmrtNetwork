"use client";

import { useState } from "react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { MarkdownOutput } from "@/components/ui/MarkdownOutput";

export function TopTalkers() {
  const { selectedNetwork } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  async function analyze() {
    if (!selectedNetwork) return;
    setLoading(true);
    setAnalysis(null);
    try {
      const res = await fetch("/api/analyze/traffic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ networkId: selectedNetwork.id }),
      });
      const data = await res.json();
      setAnalysis(data.analysis ?? data.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Traffic Analysis</h2>
          {selectedNetwork && (
            <p className="text-xs text-muted mt-0.5">{selectedNetwork.name}</p>
          )}
        </div>
        <button
          onClick={analyze}
          disabled={loading || !selectedNetwork}
          className="text-xs px-3 py-1 rounded-lg bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-40 transition-colors"
          title={!selectedNetwork ? "Select a network first" : undefined}
        >
          {loading ? "Analyzing…" : "AI Traffic Analysis"}
        </button>
      </div>
      {analysis ? (
        <MarkdownOutput content={analysis} />
      ) : (
        <p className="text-sm text-muted">
          {selectedNetwork
            ? 'Click "AI Traffic Analysis" to identify top talkers and anomalies.'
            : "Select a network from the sidebar to get started."}
        </p>
      )}
    </div>
  );
}
