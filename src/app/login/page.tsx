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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
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
            <h1 className="text-2xl font-bold text-foreground-strong">SmrtNetwork</h1>
            <p className="text-xs text-muted mt-0.5">BuildITSmrt, LLC.</p>
          </div>
          <p className="text-sm text-foreground-muted">
            {ldapEnabled ? "Sign in with your directory account" : "Enter password to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            {ldapEnabled && (
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-sm font-medium text-foreground block">
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
                    "bg-overlay border",
                    "placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent",
                    "text-foreground-strong"
                  )}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground block">
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
                  "bg-overlay border",
                  "placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent",
                  "text-foreground-strong"
                )}
              />
            </div>

            {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 text-sm font-medium text-accent-fg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </div>

          {ldapEnabled && (
            <p className="text-center text-xs text-faint">
              Leave username blank to use PIN authentication
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
