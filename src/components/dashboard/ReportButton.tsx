"use client";

import { useState, useEffect } from "react";
import { FileDown, Loader2, CheckCircle, AlertCircle, Mail, Printer } from "lucide-react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";

interface SettingsStatus {
  smtpConfigured: boolean;
}

export function ReportButton() {
  const { orgId } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [smtpConfigured, setSmtpConfigured] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: SettingsStatus) => setSmtpConfigured(d.smtpConfigured))
      .catch(() => {});
  }, []);

  async function fetchReportHtml(): Promise<string> {
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, sendEmail: false }),
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

      const blob = new Blob([data.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smrtnetwork-report-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

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
      const html = await fetchReportHtml();
      const printWindow = window.open("", "_blank");
      if (!printWindow) throw new Error("Pop-up blocked — allow pop-ups and try again");
      printWindow.document.write(html);
      printWindow.document.close();
      // Give the window a moment to render before triggering print
      setTimeout(() => printWindow.print(), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingPdf(false);
    }
  }

  const busy = loading || loadingPdf;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleGenerate}
        disabled={busy}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
          "bg-white/10 hover:bg-white/15 disabled:opacity-50"
        )}
      >
        {loading
          ? <Loader2 size={14} className="animate-spin" />
          : <FileDown size={14} />}
        {loading ? "Generating…" : "Download HTML"}
      </button>

      <button
        onClick={handlePdf}
        disabled={busy}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
          "bg-[#1e9c4a]/10 hover:bg-[#1e9c4a]/20 text-[#30ba67] border border-[#1e9c4a]/30 disabled:opacity-50"
        )}
      >
        {loadingPdf
          ? <Loader2 size={14} className="animate-spin" />
          : <Printer size={14} />}
        {loadingPdf ? "Opening…" : "Download PDF"}
      </button>

      {!smtpConfigured && !busy && (
        <span className="text-xs text-white/30 hidden md:block">
          Configure SMTP in Settings to also email
        </span>
      )}

      {emailSent && (
        <span className="flex items-center gap-1.5 text-sm text-green-400">
          <Mail size={14} />
          Email sent
        </span>
      )}

      {error && (
        <span className="flex items-center gap-1.5 text-sm text-red-400">
          <AlertCircle size={14} />
          {error}
        </span>
      )}

      {!busy && !error && !emailSent && smtpConfigured && (
        <span className="flex items-center gap-1 text-xs text-white/40">
          <CheckCircle size={12} />
          Will email on HTML download
        </span>
      )}
    </div>
  );
}
