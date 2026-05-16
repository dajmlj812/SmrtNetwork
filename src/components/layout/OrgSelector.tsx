"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";

export function OrgSelector() {
  const { organizations, selectedOrg, setSelectedOrg } = useNetwork();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (organizations.length <= 1) return null;

  return (
    <div className="px-2 mb-2" ref={ref}>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-faint mb-1">Organization</p>

      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between gap-2",
          "px-3 py-2 rounded-lg text-sm",
          "bg-overlay-strong border hover:border-strong",
          "transition-colors",
          open && "border-accent"
        )}
      >
        <span className={cn("truncate text-foreground", !selectedOrg && "text-muted")}>
          {selectedOrg?.name ?? "Select organization"}
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
          <div className="max-h-60 overflow-y-auto py-1">
            {organizations.map((org) => {
              const isSelected = org.id === selectedOrg?.id;
              return (
                <button
                  key={org.id}
                  onClick={() => {
                    setSelectedOrg(org);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left text-sm",
                    "hover:bg-overlay-strong transition-colors",
                    isSelected ? "bg-accent-soft text-accent" : "text-foreground-muted"
                  )}
                >
                  <Check
                    size={13}
                    className={cn("shrink-0", isSelected ? "opacity-100" : "opacity-0")}
                  />
                  <span className="truncate">{org.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
