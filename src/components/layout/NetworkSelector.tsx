"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";
import type { Network } from "@/lib/meraki/types";

export function NetworkSelector() {
  const { networks, selectedNetwork, setSelectedNetwork } = useNetwork();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const sorted = networks.length
    ? [...networks].sort((a, b) => {
        const isTemp = (n: Network) =>
          n.tags.some((t) => t.toLowerCase().includes("temp") || t.startsWith("ZZZ"));
        if (isTemp(a) !== isTemp(b)) return isTemp(a) ? 1 : -1;
        return a.name.localeCompare(b.name);
      })
    : [];

  const isLoading = networks.length === 0 && !selectedNetwork;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = isLoading
    ? "Loading…"
    : selectedNetwork?.name ?? "Select a network";

  return (
    <div className="px-2 mb-2" ref={ref}>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-faint mb-1">Network</p>

      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isLoading}
        className={cn(
          "w-full flex items-center justify-between gap-2",
          "px-3 py-2 rounded-lg text-sm",
          "bg-overlay-strong border hover:border-strong",
          "transition-colors disabled:opacity-40",
          open && "border-accent bg-overlay-strong"
        )}
      >
        <span className={cn("truncate text-foreground", !selectedNetwork && "text-muted")}>
          {label}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-muted transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-2 right-2 z-50 mt-1 rounded-xl border bg-card shadow-2xl shadow-black/40 overflow-hidden">
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
                    "hover:bg-overlay-strong transition-colors",
                    isSelected && "bg-accent-soft text-accent",
                    !isSelected && "text-foreground-muted",
                    isTemp && !isSelected && "text-faint"
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
        <p className="mt-1 text-xs text-faint truncate px-1">
          {selectedNetwork.productTypes.join(" · ")}
        </p>
      )}
    </div>
  );
}
