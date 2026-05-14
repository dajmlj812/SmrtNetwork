"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Loader2, Download } from "lucide-react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { formatBytes, cn } from "@/lib/utils";
import type { Client } from "@/lib/meraki/types";
import { toCSV, downloadCSV } from "@/lib/csv";

interface ClientTag { label: string; group?: string }
type TagMap = Record<string, ClientTag>;

const TIMESPANS = [
  { label: "Last hour", value: 3600 },
  { label: "Last 6 hours", value: 21600 },
  { label: "Last 24 hours", value: 86400 },
  { label: "Last 7 days", value: 604800 },
];

type SortKey = "label" | "ip" | "manufacturer" | "os" | "ssid" | "vlan" | "ap" | "lastSeen" | "usage";
type SortDir = "asc" | "desc";

function clientLabel(c: Client) {
  return c.description?.trim() || c.manufacturer || c.mac;
}

function isRecentlyActive(lastSeen: string): boolean {
  return Date.now() - new Date(lastSeen).getTime() < 15 * 60 * 1000;
}

function SortHeader({
  label, sortKey, current, dir, onSort,
}: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className="px-3 py-2 text-left text-xs font-medium text-white/40 uppercase tracking-wider cursor-pointer hover:text-white/70 select-none whitespace-nowrap"
    >
      <span className="flex items-center gap-1">
        {label}
        {active ? (
          dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        ) : (
          <ChevronsUpDown size={12} className="opacity-30" />
        )}
      </span>
    </th>
  );
}

interface ClientTableProps {
  selectedClient?: Client | null;
  onSelected?: (client: Client) => void;
}

export function ClientTable({ selectedClient, onSelected }: ClientTableProps) {
  const { selectedNetwork } = useNetwork();
  const [timespan, setTimespan] = useState(86400);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("usage");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [groupFilter, setGroupFilter] = useState("");

  const { data: tags } = useQuery<TagMap>({
    queryKey: ["client-tags"],
    queryFn: async () => {
      const res = await fetch("/api/tags");
      if (!res.ok) return {};
      return res.json() as Promise<TagMap>;
    },
    staleTime: 30_000,
  });

  const { data: clients, isLoading, isError, error } = useQuery<Client[]>({
    queryKey: ["clients", selectedNetwork?.id, timespan],
    queryFn: async () => {
      const res = await fetch(
        `/api/meraki/clients?networkId=${selectedNetwork!.id}&timespan=${timespan}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to load clients");
      }
      return res.json() as Promise<Client[]>;
    },
    enabled: !!selectedNetwork,
    staleTime: 60_000,
  });

  function handleExportCSV() {
    const rows = sorted.map((c) => {
      const tag = tags?.[c.mac.toLowerCase()];
      return {
        Name: c.description?.trim() || c.manufacturer || c.mac,
        MAC: c.mac,
        Label: tag?.label ?? "",
        Group: tag?.group ?? "",
        IP: c.ip ?? "",
        Manufacturer: c.manufacturer ?? "",
        OS: c.os ?? "",
        SSID: c.ssid ?? "",
        VLAN: c.vlan ?? "",
        AP: c.recentDeviceName ?? "",
        "Last Seen": c.lastSeen,
        "Total Usage (bytes)": c.usage.sent + c.usage.recv,
        "Download (bytes)": c.usage.recv,
        "Upload (bytes)": c.usage.sent,
      };
    });
    const columns = [
      { key: "Name", header: "Name" },
      { key: "MAC", header: "MAC" },
      { key: "Label", header: "Label" },
      { key: "Group", header: "Group" },
      { key: "IP", header: "IP" },
      { key: "Manufacturer", header: "Manufacturer" },
      { key: "OS", header: "OS" },
      { key: "SSID", header: "SSID" },
      { key: "VLAN", header: "VLAN" },
      { key: "AP", header: "AP" },
      { key: "Last Seen", header: "Last Seen" },
      { key: "Total Usage (bytes)", header: "Total Usage (bytes)" },
      { key: "Download (bytes)", header: "Download (bytes)" },
      { key: "Upload (bytes)", header: "Upload (bytes)" },
    ];
    const date = new Date().toISOString().slice(0, 10);
    const filename = `clients-${selectedNetwork?.name ?? "network"}-${date}.csv`;
    downloadCSV(toCSV(rows, columns), filename);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const allGroups = useMemo(() => {
    if (!tags) return [];
    return [...new Set(Object.values(tags).map((t) => t.group).filter(Boolean) as string[])].sort();
  }, [tags]);

  const filtered = useMemo(() => {
    if (!clients) return [];
    const q = search.toLowerCase().trim();
    return clients.filter((c) => {
      const tag = tags?.[c.mac.toLowerCase()];
      if (groupFilter && tag?.group !== groupFilter) return false;
      return (
        !q ||
        c.mac.toLowerCase().includes(q) ||
        c.ip?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.manufacturer?.toLowerCase().includes(q) ||
        c.os?.toLowerCase().includes(q) ||
        c.ssid?.toLowerCase().includes(q) ||
        c.vlan?.toLowerCase().includes(q) ||
        c.recentDeviceName?.toLowerCase().includes(q) ||
        tag?.label.toLowerCase().includes(q) ||
        tag?.group?.toLowerCase().includes(q)
      );
    });
  }, [clients, search, tags, groupFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number = 0;
      let bv: string | number = 0;
      switch (sortKey) {
        case "label":     av = clientLabel(a); bv = clientLabel(b); break;
        case "ip":        av = a.ip ?? ""; bv = b.ip ?? ""; break;
        case "manufacturer": av = a.manufacturer ?? ""; bv = b.manufacturer ?? ""; break;
        case "os":        av = a.os ?? ""; bv = b.os ?? ""; break;
        case "ssid":      av = a.ssid ?? ""; bv = b.ssid ?? ""; break;
        case "vlan":      av = a.vlan ?? ""; bv = b.vlan ?? ""; break;
        case "ap":        av = a.recentDeviceName ?? ""; bv = b.recentDeviceName ?? ""; break;
        case "lastSeen":  av = new Date(a.lastSeen).getTime(); bv = new Date(b.lastSeen).getTime(); break;
        case "usage":     av = a.usage.sent + a.usage.recv; bv = b.usage.sent + b.usage.recv; break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  if (!selectedNetwork) {
    return (
      <div className="rounded-xl border border-white/10 p-5">
        <p className="text-sm text-white/40">Select a network from the sidebar to view client devices.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar — stacks vertically on mobile */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, MAC, IP, SSID, VLAN…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-3">
          {allGroups.length > 0 && (
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="text-sm rounded-lg px-3 py-1.5 bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All groups</option>
              {allGroups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          )}
          <select
            value={timespan}
            onChange={(e) => setTimespan(Number(e.target.value))}
            className="text-sm rounded-lg px-3 py-1.5 bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {TIMESPANS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {clients && (
            <span className="text-xs text-white/30 whitespace-nowrap">
              {sorted.length} {sorted.length === 1 ? "client" : "clients"}
              {search && clients.length !== sorted.length && ` of ${clients.length}`}
            </span>
          )}
          {sorted.length > 0 && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
              title="Export visible clients as CSV"
            >
              <Download size={13} />
              CSV
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="rounded-xl border border-white/10 p-8 flex items-center justify-center gap-2 text-white/40">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading clients…</span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5">
          <p className="text-sm text-red-400">{error instanceof Error ? error.message : "Failed to load clients"}</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && clients && sorted.length === 0 && (
        <div className="rounded-xl border border-white/10 p-5">
          <p className="text-sm text-white/40">
            {search ? `No clients match "${search}".` : "No clients seen in this time window."}
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && sorted.length > 0 && (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/3 border-b border-white/10">
                <tr>
                  <th className="px-3 py-2 w-6" />
                  <SortHeader label="Name / MAC" sortKey="label" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="IP" sortKey="ip" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Manufacturer" sortKey="manufacturer" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="OS" sortKey="os" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="SSID" sortKey="ssid" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="VLAN" sortKey="vlan" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="AP" sortKey="ap" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Last Seen" sortKey="lastSeen" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Usage" sortKey="usage" current={sortKey} dir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sorted.map((c) => {
                  const total = c.usage.sent + c.usage.recv;
                  const active = isRecentlyActive(c.lastSeen);
                  const isSelected = selectedClient?.id === c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelected?.(c)}
                      className={cn(
                        "hover:bg-white/3 transition-colors",
                        onSelected && "cursor-pointer",
                        isSelected && "border-l-2 border-l-blue-500 bg-blue-500/5"
                      )}
                    >
                      <td className="pl-3 py-2.5">
                        <span
                          className={cn(
                            "block w-2 h-2 rounded-full",
                            active ? "bg-green-500" : "bg-white/15"
                          )}
                          title={active ? "Active (seen < 15 min ago)" : "Inactive"}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-white/90 truncate max-w-[160px]">
                          {c.description?.trim() || <span className="text-white/40 italic">unnamed</span>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="font-mono text-xs text-white/30">{c.mac}</span>
                          {tags?.[c.mac.toLowerCase()] && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/20 shrink-0">
                              {tags[c.mac.toLowerCase()].label}
                              {tags[c.mac.toLowerCase()].group && (
                                <span className="text-blue-400/60">· {tags[c.mac.toLowerCase()].group}</span>
                              )}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-white/70 whitespace-nowrap">
                        {c.ip ?? <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-white/70 truncate max-w-[120px]">
                        {c.manufacturer ?? <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-white/70 truncate max-w-[100px]">
                        {c.os ?? <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-white/70 truncate max-w-[100px]">
                        {c.ssid ?? <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-white/70">
                        {c.vlan ?? <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-white/70 truncate max-w-[120px]">
                        {c.recentDeviceName ?? <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-white/50 whitespace-nowrap text-xs">
                        {new Date(c.lastSeen).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {total > 0 ? (
                          <div>
                            <span className="text-white/80 font-medium">{formatBytes(total)}</span>
                            <div className="flex gap-1.5 text-xs mt-0.5">
                              <span className="text-blue-400">↓{formatBytes(c.usage.recv)}</span>
                              <span className="text-green-400">↑{formatBytes(c.usage.sent)}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
