"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Check } from "lucide-react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";
import type { Network } from "@/lib/meraki/types";

async function fetchNetworks(orgId: string): Promise<Network[]> {
  const res = await fetch(`/api/meraki/networks?orgId=${orgId}`);
  if (!res.ok) throw new Error("Failed to fetch networks");
  return res.json();
}

export function NetworkSelector() {
  const { orgId, selectedNetwork, setSelectedNetwork } = useNetwork();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: networks, isLoading, isError } = useQuery({
    queryKey: ["networks", orgId],
    queryFn: () => fetchNetworks(orgId),
    staleTime: 5 * 60 * 1000,
  });

  const sorted = networks
    ? [...networks].sort((a, b) => {
        const isTemp = (n: Network) =>
          n.tags.some((t) => t.toLowerCase().includes("temp") || t.startsWith("ZZZ"));
        if (isTemp(a) !== isTemp(b)) return isTemp(a) ? 1 : -1;
        return a.name.localeCompare(b.name);
      })
    : [];

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = isLoading
    ? "Loading…"
    : isError
    ? "Error loading networks"
    : selectedNetwork?.name ?? "Select a network";

  return (
    <div className="px-2 mb-2" ref={ref}>
      <p className="text-xs text-white/40 mb-1">Network</p>

      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isLoading || isError}
        className={cn(
          "w-full flex items-center justify-between gap-2",
          "px-3 py-2 rounded-lg text-sm",
          "bg-white/8 border border-white/15 hover:border-white/30",
          "transition-colors disabled:opacity-40",
          open && "border-blue-500/60 bg-white/10"
        )}
      >
        <span className={cn("truncate", !selectedNetwork && "text-white/40")}>
          {label}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-white/40 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-2 right-2 z-50 mt-1 rounded-xl border border-white/15 bg-gray-900 shadow-2xl shadow-black/60 overflow-hidden">
          <div className="max-h-72 overflow-y-auto py-1">
            {sorted.map((n) => {
              const isTemp = n.tags.some(
                (t) => t.toLowerCase().includes("temp") || t.startsWith("ZZZ")
              );
              const isSelected = n.id === selectedNetwork?.id;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    setSelectedNetwork(n);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left text-sm",
                    "hover:bg-white/8 transition-colors",
                    isSelected && "bg-blue-600/20 text-blue-300",
                    isTemp && !isSelected && "text-white/40"
                  )}
                >
                  <Check
                    size={13}
                    className={cn("shrink-0", isSelected ? "opacity-100" : "opacity-0")}
                  />
                  <span className="truncate">{n.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedNetwork && (
        <p className="mt-1 text-xs text-white/30 truncate px-1">
          {selectedNetwork.productTypes.join(" · ")}
        </p>
      )}
    </div>
  );
}
