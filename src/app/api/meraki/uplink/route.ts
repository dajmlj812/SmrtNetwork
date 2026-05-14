import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import type { LossAndLatency } from "@/lib/meraki/types";

interface UplinkDeviceResult {
  serial: string;
  name: string;
  model: string;
  history: LossAndLatency[];
}

export async function GET(req: NextRequest) {
  const networkId = req.nextUrl.searchParams.get("networkId");

  if (!networkId) {
    return NextResponse.json({ error: "networkId is required" }, { status: 400 });
  }

  try {
    const devices = await meraki.devices.list(networkId);

    // Filter to MX appliances and Z-series
    const appliances = devices.filter(
      (d) => d.model.startsWith("MX") || d.model.startsWith("Z")
    );

    // Cap at 3 to avoid rate limits
    const limited = appliances.slice(0, 3);

    const timespanSeconds = Number(req.nextUrl.searchParams.get("timespan") ?? "86400");
    const clampedTimespan = [3600, 21600, 86400, 604800, 2592000].includes(timespanSeconds)
      ? timespanSeconds
      : 86400;

    // Coarser resolution for longer spans to stay within Meraki data-point limits
    const resolution =
      clampedTimespan <= 3600 ? "60" :
      clampedTimespan <= 21600 ? "300" :
      clampedTimespan <= 86400 ? "600" : "3600";

    const now = new Date();
    const t0 = new Date(now.getTime() - clampedTimespan * 1000).toISOString();
    const t1 = now.toISOString();

    const results = await Promise.all(
      limited.map(async (device): Promise<UplinkDeviceResult> => {
        try {
          const history = await meraki.devices.lossAndLatency(device.serial, {
            t0,
            t1,
            resolution,
            uplink: "wan1",
          });
          return {
            serial: device.serial,
            name: device.name,
            model: device.model,
            history,
          };
        } catch {
          // Some devices may not support this endpoint
          return {
            serial: device.serial,
            name: device.name,
            model: device.model,
            history: [],
          };
        }
      })
    );

    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
