"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";

export function OrgSelector() {
  const { organizations, selectedOrg, setSelectedOrg } = useNetwork();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Only render when there are multiple orgs
  if (organizations.length <= 1) return null;

  return (
    <div className="px-2 mb-2" ref={ref}>
      <p className="text-xs text-white/40 mb-1">Organization</p>

      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between gap-2",
          "px-3 py-2 rounded-lg text-sm",
          "bg-white/8 border border-white/15 hover:border-white/30",
          "transition-colors",
          open && "border-blue-500/60 bg-white/10"
        )}
      >
        <span className={cn("truncate", !selectedOrg && "text-white/40")}>
          {selectedOrg?.name ?? "Select organization"}
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
                    "hover:bg-white/8 transition-colors",
                    isSelected && "bg-blue-600/20 text-blue-300"
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
