"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import { Camera, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CameraInfo } from "@/app/api/meraki/cameras/route";

const STATUS_COLOR: Record<string, string> = {
  online: "text-green-400",
  alerting: "text-yellow-400",
  offline: "text-red-400",
  dormant: "text-gray-400",
};

// How often each card refreshes its snapshot. Higher = lighter on Meraki's
// rate limit; lower = more "live". 20 s is a reasonable balance for an NOC view.
const REFRESH_INTERVAL_MS = 20_000;
// Stagger card refreshes so they don't all hit Meraki at the same instant.
const STAGGER_MS = 1_500;
// Meraki returns a snapshot URL immediately but the JPEG takes a few seconds
// to become available — retry the preload before giving up.
const PRELOAD_RETRIES = 4;
const PRELOAD_RETRY_DELAY_MS = 1_500;

/** Resolve true if the URL becomes loadable within the retry budget. */
function preloadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    let attempts = 0;
    const tryLoad = () => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => {
        attempts++;
        if (attempts > PRELOAD_RETRIES) {
          resolve(false);
        } else {
          setTimeout(tryLoad, PRELOAD_RETRY_DELAY_MS);
        }
      };
      img.src = url;
    };
    tryLoad();
  });
}

interface CameraCardProps {
  camera: CameraInfo;
  staggerIndex: number;
}

function CameraCard({ camera, staggerIndex }: CameraCardProps) {
  const offline = camera.status === "offline";

  // Snapshot only gets populated after the URL has actually preloaded successfully.
  // This way we never put a broken URL into the visible <img>.
  const [snapshot, setSnapshot] = useState<{ url?: string; expiry?: string }>({});
  const [refreshing, setRefreshing] = useState(false);
  const [imgVersion, setImgVersion] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(!offline && !!camera.snapshotUrl);
  const inFlight = useRef(false);

  // Preload the initial snapshot URL from props — Meraki may need a few seconds
  // before it's actually fetchable. Don't show it until the JPEG resolves.
  useEffect(() => {
    if (offline) {
      setInitialLoading(false);
      return;
    }
    if (!camera.snapshotUrl) {
      setInitialLoading(false);
      return;
    }
    let cancelled = false;
    setInitialLoading(true);
    void preloadImage(camera.snapshotUrl).then((ok) => {
      if (cancelled) return;
      if (ok) {
        setSnapshot({ url: camera.snapshotUrl, expiry: camera.snapshotExpiry });
        setImgError(false);
        setImgVersion((v) => v + 1);
      }
      setInitialLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [camera.snapshotUrl, camera.snapshotExpiry, offline]);

  const refreshSnapshot = useCallback(async () => {
    if (inFlight.current || offline) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/meraki/cameras/${camera.serial}/snapshot`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { url: string; expiry: string };

      // Meraki returns the URL immediately but the JPEG takes a few seconds.
      // Preload off-screen and only swap the visible <img> once it actually loads,
      // so the previous snapshot stays on screen — no flash, no "No preview".
      const loaded = await preloadImage(data.url);
      if (!loaded) {
        // Give up but keep the previous snapshot visible.
        return;
      }

      setSnapshot({ url: data.url, expiry: data.expiry });
      setImgError(false);
      setImgVersion((v) => v + 1);
    } catch {
      // swallow — keep showing the previous snapshot
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, [camera.serial, offline]);

  // Auto-refresh on an interval, paused when tab is hidden, staggered per card.
  useEffect(() => {
    if (offline) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let startTimer: ReturnType<typeof setTimeout> | null = null;

    function start() {
      if (timer) return;
      startTimer = setTimeout(() => {
        void refreshSnapshot();
        timer = setInterval(() => {
          void refreshSnapshot();
        }, REFRESH_INTERVAL_MS);
      }, staggerIndex * STAGGER_MS);
    }
    function stop() {
      if (startTimer) {
        clearTimeout(startTimer);
        startTimer = null;
      }
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
    function onVis() {
      if (document.visibilityState === "visible") start();
      else stop();
    }

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, [refreshSnapshot, offline, staggerIndex]);

  const isExpired = snapshot.expiry
    ? new Date(snapshot.expiry) < new Date()
    : false;
  const showSnapshot = snapshot.url && !imgError && !isExpired;

  return (
    <div className="rounded-xl border bg-overlay overflow-hidden">
      {/* Snapshot or placeholder */}
      <div className="relative aspect-video bg-black/40 flex items-center justify-center">
        {showSnapshot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={imgVersion}
            src={snapshot.url}
            alt={camera.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-faint">
            {initialLoading ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                <span className="text-xs">Loading snapshot…</span>
              </>
            ) : (
              <>
                <Camera size={32} />
                <span className="text-xs">
                  {offline
                    ? "Camera offline"
                    : isExpired
                    ? "Refreshing…"
                    : "No preview available"}
                </span>
              </>
            )}
          </div>
        )}

        {/* Status badge */}
        <div
          className={cn(
            "absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
            "bg-black/60 backdrop-blur",
            STATUS_COLOR[camera.status] ?? "text-muted"
          )}
        >
          {camera.status}
        </div>

        {/* Live indicator while refreshing */}
        {refreshing && !offline && (
          <div className="absolute top-2 right-10 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-accent">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
            </span>
            Live
          </div>
        )}

        {/* Manual refresh button */}
        <button
          type="button"
          onClick={() => void refreshSnapshot()}
          disabled={offline || refreshing}
          className="absolute top-2 right-2 p-1 rounded-lg bg-black/60 text-muted hover:text-foreground transition-colors disabled:opacity-40"
          title="Refresh snapshot now"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm truncate">{camera.name}</p>
          {camera.videoUrl && (
            <a
              href={camera.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-faint hover:text-foreground-muted transition-colors shrink-0"
              title="Open live video"
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>
        <p className="text-xs text-muted">{camera.model}</p>
        <p className="text-xs text-faint font-mono">{camera.serial}</p>
        {camera.lanIp && (
          <p className="text-xs text-faint font-mono">{camera.lanIp}</p>
        )}
      </div>
    </div>
  );
}

export default function CamerasPage() {
  const { selectedNetwork } = useNetwork();

  const { data, isLoading, isError, refetch } = useQuery<CameraInfo[]>({
    queryKey: ["cameras", selectedNetwork?.id],
    queryFn: async () => {
      const res = await fetch(`/api/meraki/cameras?networkId=${selectedNetwork!.id}`);
      if (!res.ok) throw new Error("Failed to load cameras");
      return res.json() as Promise<CameraInfo[]>;
    },
    enabled: !!selectedNetwork,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Camera size={20} className="text-purple-400" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground-strong">Cameras</h1>
        </div>
        {data && data.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>Auto-refreshing every {REFRESH_INTERVAL_MS / 1000}s</span>
            <button
              type="button"
              onClick={() => refetch()}
              className="flex items-center gap-1.5 hover:text-foreground-muted transition-colors"
            >
              <RefreshCw size={13} />
              Reload list
            </button>
          </div>
        )}
      </div>

      {!selectedNetwork && (
        <p className="text-sm text-muted">Select a network to view cameras.</p>
      )}

      {selectedNetwork && isLoading && (
        <div className="flex items-center gap-2 text-muted py-8">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading cameras…</span>
        </div>
      )}

      {selectedNetwork && isError && (
        <p className="text-sm text-red-400">Failed to load camera data.</p>
      )}

      {selectedNetwork && !isLoading && !isError && data?.length === 0 && (
        <div className="rounded-xl border p-8 text-center text-muted text-sm">
          No MV cameras found in {selectedNetwork.name}.
        </div>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((cam, idx) => (
            <CameraCard key={cam.serial} camera={cam} staggerIndex={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
