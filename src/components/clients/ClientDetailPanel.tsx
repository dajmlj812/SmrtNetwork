"use client";

import { useState, useEffect } from "react";
import { X, Download, Upload, Tag } from "lucide-react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { formatBytes, cn } from "@/lib/utils";
import { MarkdownOutput } from "@/components/ui/MarkdownOutput";
import type { Client } from "@/lib/meraki/types";

interface ClientTag { label: string; group?: string }

interface ClientDetailPanelProps {
  client: Client | null;
  onClose: () => void;
}

function InfoRow({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-white/40 uppercase tracking-wider">{label}</span>
      <span className={cn("text-sm text-white/80 break-all", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}

export function ClientDetailPanel({ client, onClose }: ClientDetailPanelProps) {
  const { selectedNetwork } = useNetwork();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Tag state
  const [tag, setTag] = useState<ClientTag | null>(null);
  const [tagLabel, setTagLabel] = useState("");
  const [tagGroup, setTagGroup] = useState("");
  const [savingTag, setSavingTag] = useState(false);
  const [tagSaved, setTagSaved] = useState(false);
  const [tagEditing, setTagEditing] = useState(false);

  useEffect(() => {
    setAnalysis(null);
    setAnalyzeError(null);
    setAnalyzing(false);
    setTag(null);
    setTagLabel("");
    setTagGroup("");
    setTagEditing(false);
    setTagSaved(false);
    if (!client) return;
    fetch(`/api/tags?mac=${encodeURIComponent(client.mac)}`)
      .then((r) => r.json())
      .then((data: ClientTag | null) => {
        if (data?.label) {
          setTag(data);
          setTagLabel(data.label);
          setTagGroup(data.group ?? "");
        }
      })
      .catch(() => {});
  }, [client?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveTag() {
    if (!client || !tagLabel.trim()) return;
    setSavingTag(true);
    setTagSaved(false);
    try {
      await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mac: client.mac, label: tagLabel.trim(), group: tagGroup.trim() || undefined }),
      });
      const saved: ClientTag = { label: tagLabel.trim(), group: tagGroup.trim() || undefined };
      setTag(saved);
      setTagSaved(true);
      setTagEditing(false);
      setTimeout(() => setTagSaved(false), 3000);
    } finally {
      setSavingTag(false);
    }
  }

  async function handleRemoveTag() {
    if (!client) return;
    setSavingTag(true);
    try {
      await fetch(`/api/tags?mac=${encodeURIComponent(client.mac)}`, { method: "DELETE" });
      setTag(null);
      setTagLabel("");
      setTagGroup("");
      setTagEditing(false);
    } finally {
      setSavingTag(false);
    }
  }

  async function handleAnalyze() {
    if (!client || !selectedNetwork) return;
    setAnalyzing(true);
    setAnalysis(null);
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/analyze/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mac: client.mac,
          networkId: selectedNetwork.id,
          clientId: client.id,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Analysis failed");
      }
      const data = (await res.json()) as { analysis: string };
      setAnalysis(data.analysis);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAnalyzing(false);
    }
  }

  const isOpen = client !== null;
  const total = client ? client.usage.sent + client.usage.recv : 0;
  const label = client?.description?.trim() || client?.manufacturer || client?.mac || "";
  const isActive = client ? Date.now() - new Date(client.lastSeen).getTime() < 15 * 60 * 1000 : false;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Slide-over panel */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 w-full sm:w-[480px] z-50",
          "bg-[var(--card)] border-l border-[var(--border)] shadow-2xl",
          "flex flex-col overflow-hidden",
          "transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-[var(--border)] shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-white truncate">{label}</h2>
              <span className={cn(
                "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border shrink-0",
                isActive
                  ? "bg-[#1e9c4a]/15 text-[#30ba67] border-[#1e9c4a]/30"
                  : "bg-white/5 text-white/30 border-white/10"
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-[#30ba67]" : "bg-white/20")} />
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
            {client && (
              <p className="text-xs text-white/40 mt-0.5">
                Last seen: {new Date(client.lastSeen).toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 hover:text-white/70 transition-colors shrink-0"
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick stats bar */}
        <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-b border-[var(--border)] shrink-0">
          <div className="px-4 py-3 text-center">
            <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Usage</div>
            <div className="text-sm font-semibold">{total > 0 ? formatBytes(total) : "—"}</div>
          </div>
          <div className="px-4 py-3 text-center">
            <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Days Seen</div>
            <div className="text-sm font-semibold">
              {client ? Math.max(1, Math.round((new Date(client.lastSeen).getTime() - new Date(client.firstSeen).getTime()) / 86400000)) : "—"}
            </div>
          </div>
          <div className="px-4 py-3 text-center">
            <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Access Point</div>
            <div className="text-sm font-semibold truncate">{client?.recentDeviceName ?? "—"}</div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {client && (
            <>
              {/* Info grid */}
              <section>
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                  Device Info
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <InfoRow label="MAC Address" value={client.mac} mono />
                  <InfoRow label="IP Address" value={client.ip} mono />
                  {client.ip6 && <InfoRow label="IPv6" value={client.ip6} mono />}
                  <InfoRow label="Manufacturer" value={client.manufacturer} />
                  <InfoRow label="OS" value={client.os} />
                  <InfoRow label="SSID" value={client.ssid} />
                  <InfoRow label="VLAN" value={client.vlan} />
                  <InfoRow label="Recent AP" value={client.recentDeviceName} />
                  <InfoRow label="First Seen" value={new Date(client.firstSeen).toLocaleString()} />
                  <InfoRow label="Last Seen" value={new Date(client.lastSeen).toLocaleString()} />
                </div>
              </section>

              {/* Usage card */}
              <section>
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                  Usage
                </h3>
                <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-white/40">Total</span>
                    <span className="text-lg font-semibold text-white/90">
                      {total > 0 ? formatBytes(total) : "—"}
                    </span>
                  </div>
                  {total > 0 && (
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5">
                        <Download size={14} className="text-blue-400" />
                        <span className="text-sm text-blue-400">{formatBytes(client.usage.recv)}</span>
                        <span className="text-xs text-white/30">down</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Upload size={14} className="text-green-400" />
                        <span className="text-sm text-green-400">{formatBytes(client.usage.sent)}</span>
                        <span className="text-xs text-white/30">up</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Tags */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag size={11} /> Label
                  </h3>
                  {!tagEditing && (
                    <button
                      type="button"
                      onClick={() => setTagEditing(true)}
                      className="text-xs text-white/30 hover:text-white/60 transition-colors"
                    >
                      {tag ? "Edit" : "Add label"}
                    </button>
                  )}
                </div>
                {!tagEditing && tag && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/20">
                      {tag.label}
                      {tag.group && <span className="text-blue-400/60 text-xs">· {tag.group}</span>}
                    </span>
                    {tagSaved && <span className="text-xs text-green-400">Saved</span>}
                  </div>
                )}
                {!tagEditing && !tag && (
                  <p className="text-xs text-white/30 italic">No label — click &ldquo;Add label&rdquo; to tag this client.</p>
                )}
                {tagEditing && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-white/40 block mb-1">Label</label>
                        <input
                          type="text"
                          value={tagLabel}
                          onChange={(e) => setTagLabel(e.target.value)}
                          placeholder="e.g. Printer, iPad, POS"
                          className="w-full px-2.5 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 block mb-1">Group (opt)</label>
                        <input
                          type="text"
                          value={tagGroup}
                          onChange={(e) => setTagGroup(e.target.value)}
                          placeholder="e.g. Floor 2, Warehouse"
                          className="w-full px-2.5 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveTag}
                        disabled={savingTag || !tagLabel.trim()}
                        className="px-3 py-1.5 rounded-lg bg-[#1e9c4a] hover:bg-[#30ba67] disabled:opacity-40 text-xs font-medium transition-colors"
                      >
                        {savingTag ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTagEditing(false); if (tag) { setTagLabel(tag.label); setTagGroup(tag.group ?? ""); } }}
                        className="px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/30 text-xs transition-colors"
                      >
                        Cancel
                      </button>
                      {tag && (
                        <button
                          type="button"
                          onClick={handleRemoveTag}
                          disabled={savingTag}
                          className="ml-auto text-xs text-red-400/60 hover:text-red-400 transition-colors"
                        >
                          Remove label
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* AI Analysis */}
              <section>
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                  AI Analysis
                </h3>
                {!analysis && !analyzing && (
                  <button
                    onClick={handleAnalyze}
                    disabled={!selectedNetwork}
                    className="w-full rounded-lg px-4 py-2.5 text-sm font-medium bg-[#1e9c4a] hover:bg-[#30ba67] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                  >
                    Analyze Client
                  </button>
                )}
                {analyzing && (
                  <div className="flex items-center gap-2 text-sm text-white/40 py-2">
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white/20 border-t-[#30ba67] rounded-full" />
                    Analyzing…
                  </div>
                )}
                {analyzeError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">
                    {analyzeError}
                  </div>
                )}
                {analysis && (
                  <div className="rounded-xl border border-[var(--border)] bg-white/3 p-4">
                    <MarkdownOutput content={analysis} />
                    <button
                      onClick={handleAnalyze}
                      className="mt-3 text-xs text-[#1e9c4a]/60 hover:text-[#30ba67] transition-colors"
                    >
                      Re-analyze
                    </button>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
}
