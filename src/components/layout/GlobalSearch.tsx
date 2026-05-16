"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Network, Monitor, Laptop, X, Loader2, Search } from "lucide-react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { cn } from "@/lib/utils";
import type { Client, Device } from "@/lib/meraki/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeviceResult {
  type: "device";
  data: Device;
}

interface ClientResult {
  type: "client";
  data: Client;
}

type ApiSearchResult = DeviceResult | ClientResult;

interface NetworkItem {
  kind: "network";
  id: string;
  label: string;
}

interface DeviceItem {
  kind: "device";
  id: string;
  label: string;
  sub: string;
}

interface ClientItem {
  kind: "client";
  id: string;
  label: string;
  sub: string;
}

type FlatResult = NetworkItem | DeviceItem | ClientItem;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ---------------------------------------------------------------------------
// GlobalSearch
// ---------------------------------------------------------------------------

export function GlobalSearch() {
  const router = useRouter();
  const { networks, selectedNetwork, setSelectedNetwork } = useNetwork();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [apiResults, setApiResults] = useState<ApiSearchResult[]>([]);
  const [apiLoading, setApiLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Open/close via keyboard and custom event
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    function handleCustomEvent() {
      setOpen(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("smrt:open-search", handleCustomEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("smrt:open-search", handleCustomEvent);
    };
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setApiResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced API fetch for devices/clients
  useEffect(() => {
    if (!open || !selectedNetwork || debouncedQuery.length < 2) {
      setApiResults([]);
      return;
    }

    let cancelled = false;
    setApiLoading(true);

    void fetch(
      `/api/meraki/search?q=${encodeURIComponent(debouncedQuery)}&networkId=${selectedNetwork.id}`
    )
      .then((r) => (r.ok ? (r.json() as Promise<ApiSearchResult[]>) : []))
      .then((data) => {
        if (!cancelled) {
          setApiResults(data);
          setApiLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setApiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, selectedNetwork, open]);

  // Network results — client-side filter
  const lower = query.toLowerCase();
  const networkMatches = query.length >= 1
    ? networks.filter((n) => n.name.toLowerCase().includes(lower))
    : [];

  // Build flat result list for keyboard nav
  const flat: FlatResult[] = [
    ...networkMatches.slice(0, 8).map<NetworkItem>((n) => ({
      kind: "network",
      id: n.id,
      label: n.name,
    })),
    ...apiResults
      .filter((r): r is DeviceResult => r.type === "device")
      .slice(0, 6)
      .map<DeviceItem>((r) => ({
        kind: "device",
        id: r.data.serial,
        label: r.data.name ?? r.data.serial,
        sub: `${r.data.model} · ${r.data.mac}`,
      })),
    ...apiResults
      .filter((r): r is ClientResult => r.type === "client")
      .slice(0, 6)
      .map<ClientItem>((r) => ({
        kind: "client",
        id: r.data.id,
        label: r.data.description ?? r.data.mac,
        sub: `${r.data.ip ?? ""} · ${r.data.mac}`,
      })),
  ];

  // Keep selectedIndex in bounds when results change
  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(flat.length - 1, 0)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flat.length]);

  // Handle item activation
  const activate = useCallback(
    (item: FlatResult) => {
      if (item.kind === "network") {
        const net = networks.find((n) => n.id === item.id);
        if (net) setSelectedNetwork(net);
        router.push("/dashboard");
      } else if (item.kind === "device") {
        router.push("/devices");
      } else {
        router.push("/clients");
      }
      setOpen(false);
    },
    [networks, router, setSelectedNetwork]
  );

  // Keyboard navigation inside modal
  function handleModalKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[selectedIndex];
      if (item) activate(item);
    }
  }

  if (!open) return null;

  // Track a running index for each rendered item to map to `selectedIndex`
  let globalIdx = 0;

  const networkCount = networkMatches.slice(0, 8).length;
  const deviceResults = apiResults.filter((r): r is DeviceResult => r.type === "device").slice(0, 6);
  const clientResults = apiResults.filter((r): r is ClientResult => r.type === "client").slice(0, 6);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Modal card */}
      <div
        className="relative max-w-lg w-full mx-4 rounded-xl bg-card border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleModalKeyDown}
      >
        {/* Search input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search size={16} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search networks, devices, clients…"
            className="flex-1 bg-transparent text-sm text-foreground-strong outline-none placeholder:text-faint"
          />
          {apiLoading && (
            <Loader2 size={14} className="animate-spin text-muted shrink-0" />
          )}
          <button
            onClick={() => setOpen(false)}
            className="text-faint hover:text-foreground-strong transition-colors"
          >
            <X size={14} />
          </button>
          <kbd className="text-[10px] text-faint font-mono border rounded px-1 py-0.5 leading-none">
            Esc
          </kbd>
        </div>

        {/* Results area */}
        {query.length >= 1 ? (
          <div className="max-h-[400px] overflow-y-auto py-2">
            {flat.length === 0 && !apiLoading && (
              <p className="text-sm text-muted text-center py-6">No results found</p>
            )}

            {/* Networks group */}
            {networkCount > 0 && (
              <div>
                <p className="text-[10px] text-faint uppercase tracking-wider px-4 py-1 font-semibold">
                  Networks
                </p>
                {networkMatches.slice(0, 8).map((n) => {
                  const idx = globalIdx++;
                  const isSelected = idx === selectedIndex;
                  const item: NetworkItem = { kind: "network", id: n.id, label: n.name };
                  return (
                    <button
                      key={n.id}
                      onClick={() => activate(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors",
                        isSelected
                          ? "bg-accent-soft text-foreground-strong"
                          : "text-foreground-muted hover:text-foreground-strong"
                      )}
                    >
                      <Network size={14} className="shrink-0 text-info" />
                      <span className="truncate">{n.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Devices group */}
            {deviceResults.length > 0 && (
              <div>
                <p className="text-[10px] text-faint uppercase tracking-wider px-4 py-1 font-semibold">
                  Devices
                </p>
                {deviceResults.map((r) => {
                  const idx = globalIdx++;
                  const isSelected = idx === selectedIndex;
                  const item: DeviceItem = {
                    kind: "device",
                    id: r.data.serial,
                    label: r.data.name ?? r.data.serial,
                    sub: `${r.data.model} · ${r.data.mac}`,
                  };
                  return (
                    <button
                      key={r.data.serial}
                      onClick={() => activate(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors",
                        isSelected
                          ? "bg-accent-soft text-foreground-strong"
                          : "text-foreground-muted hover:text-foreground-strong"
                      )}
                    >
                      <Monitor size={14} className="shrink-0 text-accent" />
                      <div className="min-w-0">
                        <p className="truncate">{r.data.name ?? r.data.serial}</p>
                        <p className="text-xs text-faint truncate font-mono">
                          {r.data.model} · {r.data.mac}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Clients group */}
            {clientResults.length > 0 && (
              <div>
                <p className="text-[10px] text-faint uppercase tracking-wider px-4 py-1 font-semibold">
                  Clients
                </p>
                {clientResults.map((r) => {
                  const idx = globalIdx++;
                  const isSelected = idx === selectedIndex;
                  const item: ClientItem = {
                    kind: "client",
                    id: r.data.id,
                    label: r.data.description ?? r.data.mac,
                    sub: `${r.data.ip ?? ""} · ${r.data.mac}`,
                  };
                  return (
                    <button
                      key={r.data.id}
                      onClick={() => activate(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors",
                        isSelected
                          ? "bg-accent-soft text-foreground-strong"
                          : "text-foreground-muted hover:text-foreground-strong"
                      )}
                    >
                      <Laptop size={14} className="shrink-0 text-info" />
                      <div className="min-w-0">
                        <p className="truncate">{r.data.description ?? r.data.mac}</p>
                        <p className="text-xs text-faint truncate font-mono">
                          {r.data.ip ?? ""} · {r.data.mac}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Empty state when no query */
          <div className="py-8 text-center">
            <p className="text-sm text-muted">
              Type to search networks
              {selectedNetwork ? ", devices, and clients" : ""}
            </p>
            {!selectedNetwork && (
              <p className="text-xs text-faint mt-1">
                Select a network to search devices and clients
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
