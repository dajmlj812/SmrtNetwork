"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Shield, Network, Wifi, Camera } from "lucide-react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";
import type { NetworkOverviewItem } from "@/app/api/meraki/overview/route";
import type { Network as MerakiNetwork } from "@/lib/meraki/types";

function ProductIcon({ type }: { type: string }) {
  const cls = "text-muted";
  if (type === "appliance") return <Shield size={14} className={cls} />;
  if (type === "switch") return <Network size={14} className={cls} />;
  if (type === "wireless") return <Wifi size={14} className={cls} />;
  if (type === "camera") return <Camera size={14} className={cls} />;
  return null;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-overlay-strong rounded w-3/4" />
      <div className="h-2 bg-overlay rounded w-full" />
      <div className="h-6 bg-overlay rounded w-full" />
      <div className="flex gap-4">
        <div className="h-3 bg-overlay rounded w-12" />
        <div className="h-3 bg-overlay rounded w-12" />
        <div className="h-3 bg-overlay rounded w-12" />
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
    if (score >= 90) return "bg-accent";
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
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500 dark:text-red-400">
        Failed to load overview: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-sm text-muted">No networks found in this organization.</p>
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
            "rounded-xl border bg-card p-4 space-y-3 text-left",
            "hover:border-strong hover:bg-card-hover transition-colors cursor-pointer w-full"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-sm leading-tight text-foreground-strong">
              {item.networkName}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {item.productTypes.map((t) => (
                <ProductIcon key={t} type={t} />
              ))}
            </div>
          </div>

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-overlay-strong text-foreground-muted px-1.5 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted">
              <span>Health</span>
              <span className="tabular-nums text-foreground-strong font-medium">
                {item.healthScore}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-overlay-strong overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", healthColor(item.healthScore))}
                style={{ width: `${item.healthScore}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-accent">
              <span>&#10003;</span>
              <span>{item.online} Online</span>
            </span>
            <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
              <span>&#10007;</span>
              <span>{item.offline} Offline</span>
            </span>
            {item.alerting > 0 && (
              <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
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
