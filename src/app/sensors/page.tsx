"use client";

import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/lib/context/NetworkContext";
import { Thermometer, Loader2, Droplets, DoorOpen, DoorClosed, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SensorReading } from "@/lib/meraki/types";

interface SensorDevice {
  serial: string;
  network: { id: string; name: string };
  readings: SensorReading[];
}

function MetricBadge({ reading }: { reading: SensorReading }) {
  if (reading.metric === "temperature" && reading.temperature) {
    const c = reading.temperature.celsius;
    const color =
      c > 35 ? "text-red-400" : c > 28 ? "text-yellow-400" : "text-green-400";
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <Thermometer size={13} className={color} />
        <span className={cn("font-mono font-semibold", color)}>
          {c.toFixed(1)}°C
        </span>
        <span className="text-faint text-xs">/ {reading.temperature.fahrenheit.toFixed(1)}°F</span>
      </div>
    );
  }

  if (reading.metric === "humidity" && reading.humidity) {
    const rh = reading.humidity.relativePercentage;
    const color =
      rh > 70 ? "text-blue-400" : rh < 30 ? "text-yellow-400" : "text-green-400";
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <Droplets size={13} className={color} />
        <span className={cn("font-mono font-semibold", color)}>{rh}%</span>
        <span className="text-faint text-xs">RH</span>
      </div>
    );
  }

  if (reading.metric === "door" && reading.door) {
    const open = reading.door.open;
    return (
      <div className="flex items-center gap-1.5 text-sm">
        {open ? (
          <DoorOpen size={13} className="text-yellow-400" />
        ) : (
          <DoorClosed size={13} className="text-green-400" />
        )}
        <span className={cn("font-medium", open ? "text-yellow-400" : "text-green-400")}>
          {open ? "Open" : "Closed"}
        </span>
      </div>
    );
  }

  if (reading.metric === "co2" && reading.co2) {
    const ppm = reading.co2.concentration;
    const color =
      ppm > 1000 ? "text-red-400" : ppm > 800 ? "text-yellow-400" : "text-green-400";
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <Zap size={13} className={color} />
        <span className={cn("font-mono font-semibold", color)}>{ppm}</span>
        <span className="text-faint text-xs">ppm CO₂</span>
      </div>
    );
  }

  return (
    <p className="text-xs text-muted capitalize">{reading.metric}</p>
  );
}

export default function SensorsPage() {
  const { orgId, selectedNetwork } = useNetwork();

  const { data, isLoading, isError } = useQuery<SensorDevice[]>({
    queryKey: ["sensors", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/meraki/sensors?orgId=${orgId}`);
      if (!res.ok) throw new Error("Failed to load sensor data");
      return res.json() as Promise<SensorDevice[]>;
    },
    enabled: !!orgId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const filtered = selectedNetwork
    ? data?.filter((d) => d.network.id === selectedNetwork.id)
    : data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Thermometer size={20} className="text-blue-400" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground-strong">Sensors</h1>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted py-8">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading sensor readings…</span>
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-400">Failed to load sensor data.</p>
      )}

      {!isLoading && !isError && (!filtered || filtered.length === 0) && (
        <div className="rounded-xl border p-8 text-center text-muted text-sm">
          No MT sensors found{selectedNetwork ? ` in ${selectedNetwork.name}` : ""}.
        </div>
      )}

      {!isLoading && !isError && filtered && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((device) => {
            const latestTs = device.readings
              .map((r) => r.ts)
              .sort()
              .pop();

            return (
              <div
                key={device.serial}
                className="rounded-xl border bg-overlay p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm font-mono">{device.serial}</p>
                    <p className="text-xs text-muted">{device.network.name}</p>
                  </div>
                  {latestTs && (
                    <span className="text-[10px] text-faint">
                      {new Date(latestTs).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {device.readings.map((r, i) => (
                    <div key={i} className="rounded-lg bg-overlay px-3 py-2">
                      <MetricBadge reading={r} />
                    </div>
                  ))}
                  {device.readings.length === 0 && (
                    <p className="text-xs text-faint">No readings yet</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
