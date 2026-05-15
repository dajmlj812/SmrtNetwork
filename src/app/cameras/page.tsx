"use client";

import { useState } from "react";
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

function CameraCard({ camera, onRefresh }: { camera: CameraInfo; onRefresh: () => void }) {
  const [imgError, setImgError] = useState(false);
  const isExpired = camera.snapshotExpiry
    ? new Date(camera.snapshotExpiry) < new Date()
    : false;
  const showSnapshot = camera.snapshotUrl && !imgError && !isExpired;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      {/* Snapshot or placeholder */}
      <div className="relative aspect-video bg-black/40 flex items-center justify-center">
        {showSnapshot ? (
          <img
            src={camera.snapshotUrl}
            alt={camera.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-white/20">
            <Camera size={32} />
            <span className="text-xs">
              {camera.status === "offline"
                ? "Camera offline"
                : isExpired
                ? "Snapshot expired"
                : "No preview"}
            </span>
          </div>
        )}

        {/* Status badge */}
        <div
          className={cn(
            "absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
            "bg-black/60 backdrop-blur",
            STATUS_COLOR[camera.status] ?? "text-white/50"
          )}
        >
          {camera.status}
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={onRefresh}
          className="absolute top-2 right-2 p-1 rounded-lg bg-black/60 text-white/40 hover:text-white/80 transition-colors"
          title="Refresh snapshot"
        >
          <RefreshCw size={12} />
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
              className="text-white/30 hover:text-white/70 transition-colors shrink-0"
              title="Open live video"
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>
        <p className="text-xs text-white/40">{camera.model}</p>
        <p className="text-xs text-white/30 font-mono">{camera.serial}</p>
        {camera.lanIp && (
          <p className="text-xs text-white/30 font-mono">{camera.lanIp}</p>
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
          <h1 className="text-2xl font-bold">Cameras</h1>
        </div>
        {data && data.length > 0 && (
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <RefreshCw size={13} />
            Refresh all
          </button>
        )}
      </div>

      {!selectedNetwork && (
        <p className="text-sm text-white/40">Select a network to view cameras.</p>
      )}

      {selectedNetwork && isLoading && (
        <div className="flex items-center gap-2 text-white/50 py-8">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading cameras…</span>
        </div>
      )}

      {selectedNetwork && isError && (
        <p className="text-sm text-red-400">Failed to load camera data.</p>
      )}

      {selectedNetwork && !isLoading && !isError && data?.length === 0 && (
        <div className="rounded-xl border border-white/10 p-8 text-center text-white/40 text-sm">
          No MV cameras found in {selectedNetwork.name}.
        </div>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((cam) => (
            <CameraCard key={cam.serial} camera={cam} onRefresh={() => refetch()} />
          ))}
        </div>
      )}
    </div>
  );
}
