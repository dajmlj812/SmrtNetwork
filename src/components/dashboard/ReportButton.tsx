"use client";

import { useState, useEffect } from "react";
import { FileDown, Loader2, CheckCircle, AlertCircle, Mail } from "lucide-react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";

interface SettingsStatus {
  smtpConfigured: boolean;
}

export function ReportButton() {
  const { orgId } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [smtpConfigured, setSmtpConfigured] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: SettingsStatus) => setSmtpConfigured(d.smtpConfigured))
      .catch(() => {});
  }, []);

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

      // Trigger download
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

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
          "bg-white/10 hover:bg-white/15 disabled:opacity-50"
        )}
      >
        {loading
          ? <Loader2 size={14} className="animate-spin" />
          : <FileDown size={14} />}
        {loading ? "Generating…" : "Generate Report"}
      </button>

      {!smtpConfigured && !loading && (
        <span className="text-xs text-white/30 hidden md:block">
          Download only — configure SMTP in Settings to also email
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

      {!loading && !error && !emailSent && smtpConfigured && (
        <span className="flex items-center gap-1 text-xs text-white/40">
          <CheckCircle size={12} />
          Will email on generate
        </span>
      )}
    </div>
  );
}
