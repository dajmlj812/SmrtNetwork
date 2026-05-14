import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import type { Device } from "@/lib/meraki/types";

function classifyProductType(model: string): string {
  if (model.startsWith("MX") || model.startsWith("Z")) return "appliance";
  if (model.startsWith("MS")) return "switch";
  if (model.startsWith("MR") || model.startsWith("CW")) return "wireless";
  if (model.startsWith("MG")) return "cellularGateway";
  if (model.startsWith("MV")) return "camera";
  if (model.startsWith("MT")) return "sensor";
  return "other";
}

export async function GET(req: NextRequest) {
  const networkId = req.nextUrl.searchParams.get("networkId");
  const orgId = req.nextUrl.searchParams.get("orgId");

  if (!networkId) {
    return NextResponse.json({ error: "networkId is required" }, { status: 400 });
  }

  try {
    const [devices, statuses] = await Promise.all([
      meraki.devices.list(networkId),
      orgId ? meraki.devices.getStatuses(orgId) : Promise.resolve([] as Device[]),
    ]);

    const statusMap = new Map(statuses.map((d) => [d.serial, d.status]));

    const enriched = devices.map((d) => ({
      ...d,
      status: statusMap.get(d.serial) ?? d.status ?? "unknown",
      productType: d.productType ?? classifyProductType(d.model),
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
