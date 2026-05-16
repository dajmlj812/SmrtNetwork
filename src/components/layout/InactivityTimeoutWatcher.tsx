"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  /** Idle minutes before automatic logout. 0 disables the watcher. */
  timeoutMinutes: number;
  /** Seconds of countdown warning before logout. */
  warningSeconds?: number;
}

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "wheel",
  "touchstart",
] as const;

// Shared across tabs so activity in one tab keeps siblings alive.
const STORAGE_KEY = "smrt-last-activity";

// Minimum interval between server-side heartbeat pings. The server's
// sliding refresh threshold is 30s, so anything in that ballpark keeps the
// cookie's activity timestamp current without flooding the server.
const HEARTBEAT_INTERVAL_MS = 30_000;

export function InactivityTimeoutWatcher({
  timeoutMinutes,
  warningSeconds = 30,
}: Props) {
  const router = useRouter();
  const lastActivityRef = useRef<number>(Date.now());
  const lastHeartbeatRef = useRef<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const enabled = timeoutMinutes > 0;
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warnMs = Math.min(warningSeconds * 1000, Math.max(timeoutMs - 1000, 0));

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Network error logging out — fall through and still redirect so the
      // user is no longer looking at protected content.
    }
    router.replace("/login");
  }, [router]);

  const markActive = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      // localStorage can throw in private modes; activity tracking still
      // works in this tab via the ref.
    }
    setSecondsLeft(null);

    // Keep the server's idea of "active" in sync. Debounce so a stream of
    // mousemove events doesn't fire one POST per frame.
    if (now - lastHeartbeatRef.current > HEARTBEAT_INTERVAL_MS) {
      lastHeartbeatRef.current = now;
      fetch("/api/auth/heartbeat", { method: "POST", keepalive: true }).catch(
        () => {
          // Network blips are fine — the next user action retries.
        }
      );
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Seed from any prior activity in a sibling tab.
    try {
      const stored = Number(localStorage.getItem(STORAGE_KEY));
      if (stored > lastActivityRef.current) lastActivityRef.current = stored;
    } catch {
      // ignore
    }

    const onActivity = () => markActive();
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, onActivity, { passive: true });
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      const t = Number(e.newValue);
      if (t > lastActivityRef.current) {
        lastActivityRef.current = t;
        setSecondsLeft(null);
      }
    };
    window.addEventListener("storage", onStorage);

    const tick = window.setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= timeoutMs) {
        setSecondsLeft(0);
        logout();
        return;
      }
      const remaining = timeoutMs - idle;
      if (remaining <= warnMs) {
        setSecondsLeft(Math.ceil(remaining / 1000));
      } else if (secondsLeft !== null) {
        setSecondsLeft(null);
      }
    }, 1000);

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, onActivity);
      }
      window.removeEventListener("storage", onStorage);
      window.clearInterval(tick);
    };
  }, [enabled, timeoutMs, warnMs, logout, markActive, secondsLeft]);

  if (!enabled || secondsLeft === null) return null;

  return (
    <div
      role="dialog"
      aria-live="assertive"
      aria-labelledby="inactivity-warning-title"
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center",
        "bg-background/70 backdrop-blur-sm",
      )}
    >
      <div className="w-full max-w-sm rounded-xl border border-strong bg-card p-5 shadow-xl space-y-3">
        <h2
          id="inactivity-warning-title"
          className="text-sm font-semibold text-foreground"
        >
          You&rsquo;re about to be signed out
        </h2>
        <p className="text-sm text-foreground-muted">
          For your security, this session will end in{" "}
          <span className="font-mono text-foreground-strong">
            {secondsLeft}
          </span>{" "}
          second{secondsLeft === 1 ? "" : "s"} due to inactivity.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => markActive()}
            className="px-4 py-1.5 rounded-lg bg-accent text-accent-fg hover:bg-accent-hover text-sm font-medium transition-colors"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}
