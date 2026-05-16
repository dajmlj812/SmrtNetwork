"use client";

import { useState, useEffect, useRef } from "react";
import { FileDown, Loader2, CheckCircle, AlertCircle, Mail, Printer, History, ExternalLink, ChevronDown } from "lucide-react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";

interface SettingsStatus {
  smtpConfigured: boolean;
}

interface ReportHistoryMeta {
  id: string;
  generatedAt: string;
  title: string;
  scope: "org" | string;
}

export function ReportButton() {
  const { orgId, selectedNetwork } = useNetwork();
  const [loading, setLoading]         = useState(false);
  const [loadingPdf, setLoadingPdf]   = useState(false);
  const [loadingNet, setLoadingNet]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [emailSent, setEmailSent]     = useState(false);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [history, setHistory]         = useState<ReportHistoryMeta[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: SettingsStatus) => setSmtpConfigured(d.smtpConfigured))
      .catch(() => {});
  }, []);

  // Close history dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function fetchReportHtml(body: Record<string, unknown>): Promise<string> {
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json() as { html?: string; error?: string };
    if (!res.ok || !data.html) throw new Error(data.error ?? "Failed to generate report");
    return data.html;
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setEmailSent(false);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, sendEmail: smtpConfigured }),
      });
      const data = await res.json() as { html?: string; emailSent?: boolean; error?: string };
      if (!res.ok || !data.html) throw new Error(data.error ?? "Failed to generate report");

      downloadHtml(data.html, `smrtnetwork-org-report-${new Date().toISOString().slice(0, 10)}.html`);

      if (data.emailSent) {
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 5000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handlePdf() {
    setLoadingPdf(true);
    setError(null);
    try {
      const html = await fetchReportHtml({ orgId, sendEmail: false });
      openPrintWindow(html);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingPdf(false);
    }
  }

  async function handleNetworkReport() {
    if (!selectedNetwork) return;
    setLoadingNet(true);
    setError(null);
    try {
      const html = await fetchReportHtml({
        networkId: selectedNetwork.id,
        networkName: selectedNetwork.name,
        sendEmail: false,
      });
      downloadHtml(html, `smrtnetwork-${selectedNetwork.name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.html`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingNet(false);
    }
  }

  async function loadHistory() {
    try {
      const res = await fetch("/api/report/history");
      const data = await res.json() as ReportHistoryMeta[];
      setHistory(data);
    } catch {
      setHistory([]);
    }
    setShowHistory((s) => !s);
  }

  const busy = loading || loadingPdf || loadingNet;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Org-wide HTML — primary */}
      <button
        onClick={handleGenerate}
        disabled={busy}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          "bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-50"
        )}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
        {loading ? "Generating…" : "Org Report"}
      </button>

      {/* Org-wide PDF */}
      <button
        onClick={handlePdf}
        disabled={busy}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          "border text-foreground-muted hover:text-foreground-strong hover:bg-overlay-strong disabled:opacity-50"
        )}
      >
        {loadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
        {loadingPdf ? "Opening…" : "PDF"}
      </button>

      {/* Per-network report — shown when a network is selected */}
      {selectedNetwork && (
        <button
          onClick={handleNetworkReport}
          disabled={busy}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            "bg-accent-soft text-accent border border-accent/30 hover:bg-accent/20 disabled:opacity-50"
          )}
        >
          {loadingNet ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
          {loadingNet ? "Generating…" : "Network Report"}
        </button>
      )}

      {/* Report history dropdown */}
      <div ref={historyRef} className="relative">
        <button
          onClick={loadHistory}
          disabled={busy}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors",
            "text-muted hover:text-foreground-strong hover:bg-overlay-strong disabled:opacity-50"
          )}
          title="Report history"
        >
          <History size={14} />
          <ChevronDown size={12} className={cn("transition-transform", showHistory && "rotate-180")} />
        </button>

        {showHistory && (
          <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-xl border bg-card shadow-xl p-2 space-y-0.5">
            <p className="text-[10px] text-faint uppercase tracking-wider px-2 py-1 font-semibold">
              Report History (last 15)
            </p>
            {history.length === 0 && (
              <p className="text-xs text-muted px-2 py-2">No reports generated yet.</p>
            )}
            {history.map((r) => (
              <a
                key={r.id}
                href={`/api/report/history?id=${r.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-overlay-strong group"
                onClick={() => setShowHistory(false)}
              >
                <div className="min-w-0">
                  <p className="text-xs text-foreground truncate">{r.title}</p>
                  <p className="text-[10px] text-faint font-mono">
                    {new Date(r.generatedAt).toLocaleString()}
                  </p>
                </div>
                <ExternalLink size={11} className="text-faint group-hover:text-foreground-muted shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Status messages */}
      {!smtpConfigured && !busy && (
        <span className="text-xs text-faint hidden lg:block">
          Configure SMTP to email reports
        </span>
      )}
      {emailSent && (
        <span className="flex items-center gap-1.5 text-sm text-accent">
          <Mail size={14} /> Email sent
        </span>
      )}
      {error && (
        <span className="flex items-center gap-1.5 text-sm text-red-500 dark:text-red-400">
          <AlertCircle size={14} /> {error}
        </span>
      )}
      {!busy && !error && !emailSent && smtpConfigured && (
        <span className="flex items-center gap-1 text-xs text-muted">
          <CheckCircle size={12} /> Will email on Org Report
        </span>
      )}
    </div>
  );
}

function downloadHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openPrintWindow(html: string) {
  const win = window.open("", "_blank");
  if (!win) throw new Error("Pop-up blocked — allow pop-ups and try again");
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 800);
}
