import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import type { SwitchPort, SwitchPortStatus } from "@/lib/meraki/types";

export interface SwitchData {
  serial: string;
  name: string;
  model: string;
  ports: SwitchPort[];
  statuses: SwitchPortStatus[];
}

export async function GET(req: NextRequest) {
  const networkId = req.nextUrl.searchParams.get("networkId");
  if (!networkId) {
    return NextResponse.json({ error: "networkId is required" }, { status: 400 });
  }

  try {
    const devices = await meraki.devices.list(networkId);
    const switches = devices.filter((d) => d.model.startsWith("MS")).slice(0, 5);

    const results = await Promise.all(
      switches.map(async (sw) => {
        try {
          const [ports, statuses] = await Promise.all([
            meraki.switchPorts.list(sw.serial),
            meraki.switchPorts.statuses(sw.serial),
          ]);
          return {
            serial: sw.serial,
            name: sw.name ?? sw.serial,
            model: sw.model,
            ports,
            statuses,
          } satisfies SwitchData;
        } catch {
          // Some switches may not support all endpoints — skip gracefully
          return null;
        }
      })
    );

    const valid = results.filter((r): r is SwitchData => r !== null);
    return NextResponse.json(valid);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
