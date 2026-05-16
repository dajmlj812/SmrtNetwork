import { NextRequest, NextResponse } from "next/server";
import { meraki } from "@/lib/meraki/client";
import { cached } from "@/lib/meraki/cache";
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

// Snapshot URLs from Meraki are valid for ~5 minutes; cache the list for 60s
// so duplicate concurrent loads (and the page's strict-mode double-render)
// don't all regenerate snapshots.
const TTL_MS = 60 * 1000;

export async function GET(req: NextRequest) {
  const networkId = req.nextUrl.searchParams.get("networkId");
  if (!networkId) {
    return NextResponse.json({ error: "networkId is required" }, { status: 400 });
  }

  try {
    const cameras = await cached(`meraki:cameras:${networkId}`, TTL_MS, () =>
      loadCameras(networkId)
    );
    return NextResponse.json(cameras);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function loadCameras(networkId: string): Promise<CameraInfo[]> {
  const devices = await meraki.devices.list(networkId);
  const cameras: Device[] = devices.filter((d) => d.model.startsWith("MV"));

  if (cameras.length === 0) return [];

  // Fetch video links + snapshots for each camera in parallel
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

  return results.map((r, i) =>
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
}
