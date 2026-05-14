"use client";

import { useState, useEffect, type FormEvent } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [ldapEnabled, setLdapEnabled] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/config")
      .then((r) => r.json())
      .then((d: { ldapEnabled: boolean }) => setLdapEnabled(d.ldapEnabled))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const body: { password: string; username?: string } = { password };
      if (ldapEnabled && username.trim()) body.username = username.trim();

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        window.location.href = "/dashboard";
      } else {
        setError(data.error ?? "Incorrect credentials");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1020] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Image
              src="/logo-mark.png"
              alt="BuildITSmrt logo"
              width={72}
              height={72}
              className="rounded-xl"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">SmrtNetwork</h1>
            <p className="text-xs text-white/30 mt-0.5">BuildITSmrt, LLC.</p>
          </div>
          <p className="text-sm text-white/40">
            {ldapEnabled ? "Sign in with your directory account" : "Enter password to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
            {ldapEnabled && (
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-sm font-medium text-white/70 block">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username or user@domain.com"
                  autoFocus
                  autoComplete="username"
                  className={cn(
                    "w-full px-3 py-2 rounded-lg text-sm",
                    "bg-white/5 border border-white/10",
                    "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#1e9c4a]",
                    "text-white"
                  )}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-white/70 block">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password…"
                autoFocus={!ldapEnabled}
                autoComplete="current-password"
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-sm",
                  "bg-white/5 border border-white/10",
                  "placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#1e9c4a]",
                  "text-white"
                )}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full px-4 py-2 rounded-lg bg-[#1e9c4a] hover:bg-[#30ba67] disabled:opacity-40 text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </div>

          {ldapEnabled && (
            <p className="text-center text-xs text-white/20">
              Leave username blank to use PIN authentication
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
