"use client";

import { useState } from "react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { MarkdownOutput } from "@/components/ui/MarkdownOutput";

export function HealthScoreCard() {
  const { orgId, selectedNetwork } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  async function runAnalysis() {
    if (!selectedNetwork) return;
    setLoading(true);
    setAnalysis(null);
    try {
      const res = await fetch("/api/analyze/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ networkId: selectedNetwork.id, orgId }),
      });
      const data = await res.json();
      setAnalysis(data.analysis ?? data.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="col-span-2 rounded-xl border border-white/10 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Network Health</h2>
          {selectedNetwork && (
            <p className="text-xs text-white/40 mt-0.5">{selectedNetwork.name}</p>
          )}
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading || !selectedNetwork}
          className="text-xs px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-colors"
          title={!selectedNetwork ? "Select a network first" : undefined}
        >
          {loading ? "Analyzing…" : "Analyze with AI"}
        </button>
      </div>
      {analysis && <MarkdownOutput content={analysis} />}
      {!analysis && !loading && (
        <p className="text-sm text-white/40">
          {selectedNetwork
            ? 'Click "Analyze with AI" to run a health assessment.'
            : "Select a network from the sidebar to get started."}
        </p>
      )}
    </div>
  );
}
