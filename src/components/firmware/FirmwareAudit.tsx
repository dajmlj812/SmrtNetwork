"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import { ChevronDown, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FirmwareGroup } from "@/app/api/meraki/firmware/route";

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 3 }).map((_, i) => (
        <td key={i} className="px-4 py-2.5">
          <div className="h-4 bg-overlay-strong rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

function getFirmwareDocsUrl(productType: string): string {
  const map: Record<string, string> = {
    wireless:        "https://documentation.meraki.com/MR/MR_-_Wireless/MR_Firmware_Changelog",
    switch:          "https://documentation.meraki.com/MS/MS_-_Layer_3_Switch/MS_Firmware_Changelog",
    appliance:       "https://documentation.meraki.com/MX/MX_-_Security_%26_SD-WAN/MX_Firmware_Changelog",
    cellularGateway: "https://documentation.meraki.com/MG/MG_-_Cellular_Gateway/MG_Firmware_Changelog",
    camera:          "https://documentation.meraki.com/MV/MV_-_Smart_Camera/MV_Firmware_Changelog",
    sensor:          "https://documentation.meraki.com/MT/MT_-_Sensor/MT_Firmware_Changelog",
  };
  return map[productType] ?? "https://documentation.meraki.com/General_Administration/Firmware_Upgrades/";
}

function ProductTypeSection({
  productType,
  groups,
}: {
  productType: string;
  groups: FirmwareGroup[];
}) {
  const [open, setOpen] = useState(true);

  const maxCount = Math.max(...groups.map((g) => g.count));
  const totalDevices = groups.reduce((sum, g) => sum + g.count, 0);
  const hasMultipleVersions = groups.length > 1;

  return (
    <div className="rounded-xl border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 border-b hover:bg-overlay transition-colors"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown size={14} className="text-muted" />
          ) : (
            <ChevronRight size={14} className="text-muted" />
          )}
          <span className="font-semibold text-sm uppercase tracking-wide text-foreground">
            {productType}
          </span>
          {hasMultipleVersions && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
              {groups.length} versions
            </span>
          )}
        </div>
        <span className="text-xs text-faint">{totalDevices} device{totalDevices !== 1 ? "s" : ""}</span>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border">
                <th className="px-5 py-2 text-left text-xs text-muted font-medium">
                  Firmware Version
                </th>
                <th className="px-5 py-2 text-left text-xs text-muted font-medium">
                  Device Count
                </th>
                <th className="px-5 py-2 text-left text-xs text-muted font-medium">
                  Networks
                </th>
                <th className="px-5 py-2 text-left text-xs text-muted font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const isBaseline = group.count === maxCount;
                return (
                  <tr
                    key={group.firmware}
                    className="border-b last:border-0 hover:bg-overlay"
                  >
                    <td className="px-5 py-3">
                      <a
                        href={getFirmwareDocsUrl(productType)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 font-mono text-xs text-foreground hover:text-accent transition-colors group"
                      >
                        {group.firmware}
                        <ExternalLink size={11} className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                      </a>
                    </td>
                    <td className="px-5 py-3 text-foreground-muted">
                      {group.count}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {group.networks.length}
                    </td>
                    <td className="px-5 py-3">
                      {isBaseline ? (
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-full text-xs border",
                            hasMultipleVersions
                              ? "bg-green-500/15 text-green-400 border-green-500/30"
                              : "bg-overlay text-faint border"
                          )}
                        >
                          {hasMultipleVersions ? "Baseline (most common)" : "Uniform"}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs border bg-yellow-500/15 text-yellow-400 border-yellow-500/30">
                          Potentially outdated
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function FirmwareAudit() {
  const { selectedOrg } = useNetwork();
  const orgId = selectedOrg?.id;

  const { data, isLoading, isError, error } = useQuery<FirmwareGroup[]>({
    queryKey: ["firmware-audit", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/meraki/firmware?orgId=${orgId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to load firmware data");
      }
      return res.json() as Promise<FirmwareGroup[]>;
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });

  if (!orgId) {
    return (
      <div className="rounded-xl border p-5">
        <p className="text-sm text-muted">No organization selected.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border overflow-hidden">
        <div className="px-5 py-4 border-b border">
          <div className="h-4 w-32 bg-overlay-strong rounded animate-pulse" />
        </div>
        <table className="w-full text-sm">
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5">
        <p className="text-sm text-red-400">
          {error instanceof Error ? error.message : "Failed to load firmware data"}
        </p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border p-5">
        <p className="text-sm text-muted">No device data available.</p>
      </div>
    );
  }

  // Group FirmwareGroups by productType
  const byProductType = new Map<string, FirmwareGroup[]>();
  for (const group of data) {
    const existing = byProductType.get(group.productType);
    if (existing) {
      existing.push(group);
    } else {
      byProductType.set(group.productType, [group]);
    }
  }

  const productTypes = Array.from(byProductType.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <div className="space-y-4">
      {productTypes.map(([productType, groups]) => (
        <ProductTypeSection
          key={productType}
          productType={productType}
          groups={groups}
        />
      ))}
    </div>
  );
}
