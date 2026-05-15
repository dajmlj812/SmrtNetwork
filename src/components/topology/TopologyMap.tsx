"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import type { Device, LossAndLatency } from "@/lib/meraki/types";

interface TopoDevice extends Omit<Device, "status"> {
  productType: string;
  status: string;
}

const STATUS_COLOR: Record<string, string> = {
  online:   "#1e9c4a",
  alerting: "#f5d991",
  offline:  "#ef4444",
  dormant:  "#6b7280",
  unknown:  "#6b7280",
};

const LAYER_ORDER = ["appliance", "switch", "wireless", "cellularGateway", "camera", "sensor", "other"];

const LAYER_LABEL: Record<string, string> = {
  appliance:        "Firewalls / Routers",
  switch:           "Switches",
  wireless:         "Access Points",
  cellularGateway:  "Cellular Gateways",
  camera:           "Cameras",
  sensor:           "Sensors",
  other:            "Other",
};

// ---------------------------------------------------------------------------
// Uplink sparkline for the hover panel
// ---------------------------------------------------------------------------

function UplinkSparkline({ serial }: { serial: string }) {
  const { data, isLoading } = useQuery<{ serial: string; history: LossAndLatency[] }[]>({
    queryKey: ["uplink-history", serial],
    queryFn: async () => {
      const res = await fetch(`/api/meraki/uplink?serial=${serial}&timespan=3600`);
      if (!res.ok) return [];
      return res.json() as Promise<{ serial: string; history: LossAndLatency[] }[]>;
    },
    staleTime: 5 * 60_000,
  });

  const history = data?.[0]?.history ?? [];
  const hasData = history.length > 1;

  if (isLoading) {
    return <div className="h-8 mt-2 rounded bg-white/5 animate-pulse" />;
  }

  if (!hasData) return null;

  const lossValues = history.map((h) => h.lossPercent ?? 0);
  const latencyValues = history.map((h) => h.latencyMs ?? 0);
  const maxLoss = Math.max(...lossValues, 1);
  const maxLatency = Math.max(...latencyValues, 1);
  const W = 160;
  const H = 32;
  const step = W / (history.length - 1);

  function toPath(values: number[], max: number): string {
    return values
      .map((v, i) => {
        const x = i * step;
        const y = H - (v / max) * H;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  const avgLoss = (lossValues.reduce((a, b) => a + b, 0) / lossValues.length).toFixed(1);
  const avgLatency = (latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length).toFixed(0);

  return (
    <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
      <p className="text-[10px] text-white/30 uppercase tracking-wider">WAN1 · 1h</p>
      <svg width={W} height={H} className="overflow-visible">
        <path d={toPath(latencyValues, maxLatency)} fill="none" stroke="#3b82f6" strokeWidth={1.2} />
        <path d={toPath(lossValues, maxLoss)} fill="none" stroke="#ef4444" strokeWidth={1.2} />
      </svg>
      <div className="flex gap-3 text-[10px]">
        <span className="text-blue-400">Latency: {avgLatency}ms</span>
        <span className="text-red-400">Loss: {avgLoss}%</span>
      </div>
    </div>
  );
}

function DeviceHoverCard({
  device,
}: {
  device: TopoDevice;
}) {
  const isAppliance = device.model.startsWith("MX") || device.model.startsWith("Z");
  return (
    <div className="absolute top-3 right-3 rounded-xl border border-white/10 bg-[#131728]/95 backdrop-blur p-3 text-xs space-y-1 min-w-44 pointer-events-none">
      <p className="font-semibold text-white truncate">
        {device.name || device.serial}
      </p>
      <p className="text-white/50">{device.model}</p>
      <p className="text-white/35 font-mono">{device.serial}</p>
      {device.lanIp && (
        <p className="text-white/40">LAN: {device.lanIp}</p>
      )}
      {device.wan1Ip && (
        <p className="text-white/40">WAN: {device.wan1Ip}</p>
      )}
      <p
        className="capitalize font-medium"
        style={{ color: STATUS_COLOR[device.status] ?? STATUS_COLOR.unknown }}
      >
        {device.status}
      </p>
      {isAppliance && <UplinkSparkline serial={device.serial} />}
    </div>
  );
}

const NODE_R = 22;
const NODE_SPACING_X = 80;
const LAYER_HEIGHT = 120;
const CANVAS_PADDING_X = 120;
const CANVAS_PADDING_Y = 50;

function classifyProductType(model: string): string {
  if (model.startsWith("MX") || model.startsWith("Z")) return "appliance";
  if (model.startsWith("MS")) return "switch";
  if (model.startsWith("MR") || model.startsWith("CW")) return "wireless";
  if (model.startsWith("MG")) return "cellularGateway";
  if (model.startsWith("MV")) return "camera";
  if (model.startsWith("MT")) return "sensor";
  return "other";
}

const LEGEND_ITEMS: [string, string][] = [
  ["online",   "Online"],
  ["alerting", "Alerting"],
  ["offline",  "Offline"],
  ["unknown",  "Unknown"],
];

export function TopologyMap() {
  const { selectedNetwork, orgId } = useNetwork();
  const [hovered, setHovered] = useState<string | null>(null);

  const { data: devices, isLoading, error } = useQuery<TopoDevice[]>({
    queryKey: ["topology", selectedNetwork?.id],
    queryFn: async () => {
      const params = new URLSearchParams({ networkId: selectedNetwork!.id });
      if (orgId) params.set("orgId", orgId);
      const res = await fetch(`/api/meraki/topology?${params}`);
      if (!res.ok) throw new Error("Failed to load topology data");
      return res.json() as Promise<TopoDevice[]>;
    },
    enabled: !!selectedNetwork,
    staleTime: 5 * 60_000,
  });

  if (!selectedNetwork) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-white/40 text-sm animate-pulse">
        Loading topology…
      </div>
    );
  }

  if (error || !devices || devices.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 p-8 flex items-center justify-center text-white/40 text-sm">
        No devices found in this network
      </div>
    );
  }

  // Group by product type
  const grouped: Record<string, TopoDevice[]> = {};
  for (const d of devices) {
    const pt = d.productType ?? classifyProductType(d.model);
    if (!grouped[pt]) grouped[pt] = [];
    grouped[pt].push(d);
  }

  const layers = LAYER_ORDER.filter((l) => grouped[l]?.length);

  const maxPerLayer = Math.max(...layers.map((l) => grouped[l].length));
  const canvasWidth = Math.max(500, maxPerLayer * NODE_SPACING_X + CANVAS_PADDING_X * 2);
  const canvasHeight = layers.length * LAYER_HEIGHT + CANVAS_PADDING_Y * 2;

  // Compute node positions
  const nodePos = new Map<string, { x: number; y: number }>();
  layers.forEach((layer, li) => {
    const layerDevices = grouped[layer];
    const y = CANVAS_PADDING_Y + li * LAYER_HEIGHT + LAYER_HEIGHT / 2;
    const totalWidth = (layerDevices.length - 1) * NODE_SPACING_X;
    const startX = canvasWidth / 2 - totalWidth / 2;
    layerDevices.forEach((d, di) => {
      nodePos.set(d.serial, { x: startX + di * NODE_SPACING_X, y });
    });
  });

  // Lines: each node connects to its nearest node in the layer above
  const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  for (let li = 1; li < layers.length; li++) {
    const upper = grouped[layers[li - 1]];
    const lower = grouped[layers[li]];
    lower.forEach((ld) => {
      const lp = nodePos.get(ld.serial)!;
      let nearestSerial = upper[0].serial;
      let minDist = Infinity;
      upper.forEach((ud) => {
        const up = nodePos.get(ud.serial)!;
        const dist = Math.abs(up.x - lp.x);
        if (dist < minDist) { minDist = dist; nearestSerial = ud.serial; }
      });
      const up = nodePos.get(nearestSerial)!;
      lines.push({
        x1: up.x, y1: up.y + NODE_R,
        x2: lp.x, y2: lp.y - NODE_R,
        key: `${nearestSerial}-${ld.serial}`,
      });
    });
  }

  const hoveredDevice = hovered ? devices.find((d) => d.serial === hovered) : null;

  // Status counts for summary
  const counts = { online: 0, alerting: 0, offline: 0, unknown: 0 };
  devices.forEach((d) => {
    const s = d.status as keyof typeof counts;
    if (s in counts) counts[s]++;
    else counts.unknown++;
  });

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <div className="flex items-center gap-3 flex-wrap">
        {LEGEND_ITEMS.map(([status, label]) => (
          <span key={status} className="flex items-center gap-1.5 text-xs text-white/50">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLOR[status] }}
            />
            {label}
            <span className="text-white/30 font-mono">{counts[status as keyof typeof counts]}</span>
          </span>
        ))}
        <span className="ml-auto text-xs text-white/30">{devices.length} devices</span>
      </div>

      {/* SVG canvas */}
      <div className="relative overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02]">
        <svg width={canvasWidth} height={canvasHeight} className="block">
          {/* Layer labels on left */}
          {layers.map((layer, li) => {
            const y = CANVAS_PADDING_Y + li * LAYER_HEIGHT + LAYER_HEIGHT / 2;
            return (
              <text
                key={layer}
                x={8}
                y={y + 4}
                fill="rgba(255,255,255,0.2)"
                fontSize={10}
                fontFamily="monospace"
              >
                {LAYER_LABEL[layer]}
              </text>
            );
          })}

          {/* Horizontal layer dividers */}
          {layers.slice(1).map((_, li) => {
            const y = CANVAS_PADDING_Y + (li + 1) * LAYER_HEIGHT;
            return (
              <line
                key={li}
                x1={0} y1={y} x2={canvasWidth} y2={y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={1}
              />
            );
          })}

          {/* Connection lines */}
          {lines.map((l) => (
            <line
              key={l.key}
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          ))}

          {/* Device nodes */}
          {devices.map((d) => {
            const pos = nodePos.get(d.serial);
            if (!pos) return null;
            const color = STATUS_COLOR[d.status] ?? STATUS_COLOR.unknown;
            const isHov = hovered === d.serial;
            const r = isHov ? NODE_R + 3 : NODE_R;
            return (
              <g
                key={d.serial}
                transform={`translate(${pos.x},${pos.y})`}
                onMouseEnter={() => setHovered(d.serial)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Glow ring on hover */}
                {isHov && (
                  <circle r={r + 6} fill="none" stroke={color} strokeWidth={1} opacity={0.3} />
                )}
                <circle
                  r={r}
                  fill={`${color}1a`}
                  stroke={color}
                  strokeWidth={isHov ? 2.5 : 1.5}
                />
                {/* Model text inside node */}
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={8}
                  fill="rgba(255,255,255,0.7)"
                  fontFamily="monospace"
                  pointerEvents="none"
                >
                  {d.model.slice(0, 7)}
                </text>
                {/* Device name below node */}
                <text
                  y={NODE_R + 14}
                  textAnchor="middle"
                  fontSize={9}
                  fill="rgba(255,255,255,0.45)"
                  fontFamily="sans-serif"
                  pointerEvents="none"
                >
                  {(d.name || d.serial).slice(0, 14)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover panel — absolute inside the relative wrapper */}
        {hoveredDevice && <DeviceHoverCard device={hoveredDevice} />}
      </div>
    </div>
  );
}
