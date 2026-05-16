import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import { cached } from "@/lib/meraki/cache";

// Firmware versions change rarely (upgrades happen on a schedule); 2 min TTL.
const TTL_MS = 2 * 60 * 1000;

function deriveProductType(model: string): string {
  if (!model) return "other";
  if (model.startsWith("MR") || model.startsWith("CW")) return "wireless";
  if (model.startsWith("MS")) return "switch";
  if (model.startsWith("MX") || model.startsWith("Z")) return "appliance";
  if (model.startsWith("MG")) return "cellularGateway";
  if (model.startsWith("MT")) return "sensor";
  if (model.startsWith("MV")) return "camera";
  return "other";
}

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
    const devices = await cached(
      `meraki:devices-by-org:${orgId}`,
      TTL_MS,
      () => meraki.devices.listByOrg(orgId)
    );

    // Group by productType + firmware
    const groupMap = new Map<string, FirmwareGroup>();

    for (const device of devices) {
      const productType = device.productType ?? deriveProductType(device.model);
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
