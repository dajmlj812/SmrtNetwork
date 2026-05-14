import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";

export interface FirmwareGroup {
  productType: string;
  firmware: string;
  count: number;
  serials: string[];
  networks: string[];
}

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  try {
    const devices = await meraki.devices.getStatuses(orgId);

    // Group by productType + firmware
    const groupMap = new Map<string, FirmwareGroup>();

    for (const device of devices) {
      // The Meraki API includes productType on device statuses but it's not in our Device type
      // Access it via type assertion since it's a runtime field
      const rawDevice = device as typeof device & { productType?: string };
      const productType =
        rawDevice.productType ??
        (device.model ? device.model.slice(0, 2) : "unknown");
      const firmware = device.firmware ?? "unknown";
      const key = `${productType}::${firmware}`;

      const existing = groupMap.get(key);
      if (existing) {
        existing.count++;
        existing.serials.push(device.serial);
        if (device.networkId && !existing.networks.includes(device.networkId)) {
          existing.networks.push(device.networkId);
        }
      } else {
        groupMap.set(key, {
          productType,
          firmware,
          count: 1,
          serials: [device.serial],
          networks: device.networkId ? [device.networkId] : [],
        });
      }
    }

    // Sort: by productType asc, then by count desc within each type
    const groups = Array.from(groupMap.values()).sort((a, b) => {
      const typeCompare = a.productType.localeCompare(b.productType);
      if (typeCompare !== 0) return typeCompare;
      return b.count - a.count;
    });

    return NextResponse.json(groups);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
