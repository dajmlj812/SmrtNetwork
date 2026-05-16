"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";
import type { MerakiEvent } from "@/lib/meraki/types";

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function getBadgeClass(event: MerakiEvent): string {
  const t = event.type.toLowerCase();
  const d = event.description.toLowerCase();

  if (t.includes("association") || t.includes("disassociation")) {
    return "bg-info-soft text-info";
  }
  if (t.includes("auth") || t.includes("deauth")) {
    return d.includes("failure") || d.includes("fail")
      ? "bg-red-500/15 text-red-500 dark:text-red-300"
      : "bg-accent-soft text-accent";
  }
  if (t.includes("reboot") || t.includes("started") || t.includes("restart")) {
    return "bg-orange-500/15 text-orange-500 dark:text-orange-300";
  }
  if (t.includes("config") || t.includes("settings") || t.includes("change")) {
    return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-300";
  }
  return "bg-overlay-strong text-muted";
}

function EventSkeleton() {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0 animate-pulse">
      <div className="h-4 w-12 rounded-full bg-overlay-strong shrink-0 mt-0.5" />
      <div className="h-4 w-16 rounded-full bg-overlay-strong shrink-0" />
      <div className="h-4 flex-1 rounded bg-overlay" />
    </div>
  );
}

async function fetchEvents(networkId: string): Promise<MerakiEvent[]> {
  const res = await fetch(`/api/meraki/events?networkId=${networkId}&perPage=25`);
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json() as Promise<MerakiEvent[]>;
}

export function EventFeed() {
  const router = useRouter();
  const { selectedNetwork } = useNetwork();

  const { data: events, isLoading, isError } = useQuery<MerakiEvent[]>({
    queryKey: ["events", selectedNetwork?.id],
    queryFn: () => fetchEvents(selectedNetwork!.id),
    enabled: !!selectedNetwork,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  if (!selectedNetwork || isError) return null;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold text-foreground-strong">Recent Events</h2>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
        </span>
        {selectedNetwork && (
          <button
            type="button"
            onClick={() => router.push("/network")}
            className="ml-auto text-xs text-muted hover:text-accent hover:underline transition-colors"
          >
            {selectedNetwork.name}
          </button>
        )}
      </div>

      {isLoading && (
        <div>
          {Array.from({ length: 6 }).map((_, i) => (
            <EventSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && !isError && events?.length === 0 && (
        <p className="text-sm text-muted">No recent events</p>
      )}

      {!isLoading && !isError && events && events.length > 0 && (
        <div className="max-h-[300px] overflow-y-auto space-y-0 -mx-1 px-1">
          {events.map((event, i) => (
            <div
              key={`${event.occurredAt}-${i}`}
              className="flex items-start gap-3 py-2.5 border-b last:border-0"
            >
              <span className="text-xs text-faint shrink-0 pt-0.5 w-14 text-right leading-none font-mono">
                {relativeTime(event.occurredAt)}
              </span>

              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 leading-none whitespace-nowrap",
                  getBadgeClass(event)
                )}
              >
                {event.type.replace(/_/g, " ")}
              </span>

              <p className="text-xs text-foreground-muted leading-snug min-w-0">
                {event.description}
                {event.deviceName && (
                  <span className="text-muted"> — {event.deviceName}</span>
                )}
                {event.clientDescription && (
                  <span className="text-muted"> · {event.clientDescription}</span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
