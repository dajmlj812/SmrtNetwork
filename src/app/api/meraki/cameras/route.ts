import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import type { Device } from "@/lib/meraki/types";

export interface CameraInfo {
  serial: string;
  name: string;
  model: string;
  networkId: string;
  status: string;
  lanIp?: string;
  snapshotUrl?: string;
  snapshotExpiry?: string;
  videoUrl?: string;
}

export async function GET(req: NextRequest) {
  const networkId = req.nextUrl.searchParams.get("networkId");
  if (!networkId) {
    return NextResponse.json({ error: "networkId is required" }, { status: 400 });
  }

  try {
    const devices = await meraki.devices.list(networkId);
    const cameras: Device[] = devices.filter((d) => d.model.startsWith("MV"));

    if (cameras.length === 0) return NextResponse.json([]);

    // Fetch video links for each camera (snapshot URL is embedded)
    const results = await Promise.allSettled(
      cameras.map(async (cam): Promise<CameraInfo> => {
        let snapshotUrl: string | undefined;
        let snapshotExpiry: string | undefined;
        let videoUrl: string | undefined;

        try {
          const link = await meraki.camera.videoLink(cam.serial);
          videoUrl = link.url;
          snapshotExpiry = link.expires;
        } catch {
          // camera may not have a live link
        }

        try {
          const snap = await meraki.camera.generateSnapshot(cam.serial);
          snapshotUrl = snap.url;
          snapshotExpiry = snap.expiry;
        } catch {
          // snapshot generation may fail if camera is offline
        }

        return {
          serial: cam.serial,
          name: cam.name ?? cam.serial,
          model: cam.model,
          networkId: cam.networkId ?? networkId,
          status: cam.status ?? "unknown",
          lanIp: cam.lanIp,
          snapshotUrl,
          snapshotExpiry,
          videoUrl,
        };
      })
    );

    const cameras_out: CameraInfo[] = results.map((r, i) =>
      r.status === "fulfilled"
        ? r.value
        : {
            serial: cameras[i].serial,
            name: cameras[i].name ?? cameras[i].serial,
            model: cameras[i].model,
            networkId,
            status: cameras[i].status ?? "unknown",
          }
    );

    return NextResponse.json(cameras_out);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
