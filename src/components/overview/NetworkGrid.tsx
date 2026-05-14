"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Shield, Network, Wifi, Camera } from "lucide-react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";
import type { NetworkOverviewItem } from "@/app/api/meraki/overview/route";
import type { Network as MerakiNetwork } from "@/lib/meraki/types";

function ProductIcon({ type }: { type: string }) {
  if (type === "appliance") return <Shield size={14} className="text-white/50" />;
  if (type === "switch") return <Network size={14} className="text-white/50" />;
  if (type === "wireless") return <Wifi size={14} className="text-white/50" />;
  if (type === "camera") return <Camera size={14} className="text-white/50" />;
  return null;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/10 p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-3/4" />
      <div className="h-2 bg-white/5 rounded w-full" />
      <div className="h-6 bg-white/5 rounded w-full" />
      <div className="flex gap-4">
        <div className="h-3 bg-white/5 rounded w-12" />
        <div className="h-3 bg-white/5 rounded w-12" />
        <div className="h-3 bg-white/5 rounded w-12" />
      </div>
    </div>
  );
}

export function NetworkGrid() {
  const { orgId, setSelectedNetwork } = useNetwork();
  const router = useRouter();

  const { data, isLoading, error } = useQuery<NetworkOverviewItem[]>({
    queryKey: ["overview", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/meraki/overview?orgId=${orgId}`);
      if (!res.ok) throw new Error("Failed to fetch overview");
      return res.json() as Promise<NetworkOverviewItem[]>;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled: !!orgId,
  });

  function handleCardClick(item: NetworkOverviewItem) {
    const network: MerakiNetwork = {
      id: item.networkId,
      organizationId: orgId,
      name: item.networkName,
      productTypes: item.productTypes,
      timeZone: "",
      tags: item.tags,
    };
    setSelectedNetwork(network);
    router.push("/dashboard");
  }

  function healthColor(score: number) {
    if (score >= 90) return "bg-green-500";
    if (score >= 70) return "bg-yellow-500";
    return "bg-red-500";
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
        Failed to load overview: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-white/40 text-center py-12">
        No networks found in this organization.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((item) => (
        <button
          key={item.networkId}
          onClick={() => handleCardClick(item)}
          className={cn(
            "rounded-xl border border-white/10 p-4 space-y-3 text-left",
            "hover:border-white/20 hover:bg-white/5 transition-colors cursor-pointer w-full"
          )}
        >
          {/* Name + icons */}
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-sm leading-tight">{item.networkName}</span>
            <div className="flex items-center gap-1 shrink-0">
              {item.productTypes.map((t) => (
                <ProductIcon key={t} type={t} />
              ))}
            </div>
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-white/10 text-white/60 px-1.5 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Health bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-white/50">
              <span>Health</span>
              <span>{item.healthScore}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", healthColor(item.healthScore))}
                style={{ width: `${item.healthScore}%` }}
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-green-400">
              <span>&#10003;</span>
              <span>{item.online} Online</span>
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <span>&#10007;</span>
              <span>{item.offline} Offline</span>
            </span>
            {item.alerting > 0 && (
              <span className="flex items-center gap-1 text-yellow-400">
                <span>&#9888;</span>
                <span>{item.alerting} Alerting</span>
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
