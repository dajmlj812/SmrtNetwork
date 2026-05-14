"use client";

import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";
import type { MerakiEvent } from "@/lib/meraki/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    return "bg-blue-500/20 text-blue-300";
  }
  if (t.includes("auth") || t.includes("deauth")) {
    return d.includes("failure") || d.includes("fail")
      ? "bg-red-500/20 text-red-300"
      : "bg-green-500/20 text-green-300";
  }
  if (t.includes("reboot") || t.includes("started") || t.includes("restart")) {
    return "bg-orange-500/20 text-orange-300";
  }
  if (t.includes("config") || t.includes("settings") || t.includes("change")) {
    return "bg-yellow-500/20 text-yellow-300";
  }
  return "bg-white/10 text-white/50";
}

function EventSkeleton() {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0 animate-pulse">
      <div className="h-4 w-12 rounded-full bg-white/10 shrink-0 mt-0.5" />
      <div className="h-4 w-16 rounded-full bg-white/10 shrink-0" />
      <div className="h-4 flex-1 rounded bg-white/5" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// EventFeed
// ---------------------------------------------------------------------------

async function fetchEvents(networkId: string): Promise<MerakiEvent[]> {
  const res = await fetch(`/api/meraki/events?networkId=${networkId}&perPage=25`);
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json() as Promise<MerakiEvent[]>;
}

export function EventFeed() {
  const { selectedNetwork } = useNetwork();

  const { data: events, isLoading, isError } = useQuery<MerakiEvent[]>({
    queryKey: ["events", selectedNetwork?.id],
    queryFn: () => fetchEvents(selectedNetwork!.id),
    enabled: !!selectedNetwork,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  if (!selectedNetwork) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold">Recent Events</h2>
        {/* Pulsing live dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div>
          {Array.from({ length: 6 }).map((_, i) => (
            <EventSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <p className="text-sm text-red-400">Failed to load events.</p>
      )}

      {/* Empty state */}
      {!isLoading && !isError && events?.length === 0 && (
        <p className="text-sm text-white/40">No recent events</p>
      )}

      {/* Event list */}
      {!isLoading && !isError && events && events.length > 0 && (
        <div className="max-h-[300px] overflow-y-auto space-y-0 -mx-1 px-1">
          {events.map((event, i) => (
            <div
              key={`${event.occurredAt}-${i}`}
              className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0"
            >
              {/* Relative time */}
              <span className="text-xs text-white/30 shrink-0 pt-0.5 w-14 text-right leading-none">
                {relativeTime(event.occurredAt)}
              </span>

              {/* Type badge */}
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 leading-none whitespace-nowrap",
                  getBadgeClass(event)
                )}
              >
                {event.type.replace(/_/g, " ")}
              </span>

              {/* Description */}
              <p className="text-xs text-white/60 leading-snug min-w-0">
                {event.description}
                {event.deviceName && (
                  <span className="text-white/40"> — {event.deviceName}</span>
                )}
                {event.clientDescription && (
                  <span className="text-white/40"> · {event.clientDescription}</span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
