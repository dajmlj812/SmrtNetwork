import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

const DATA_DIR = join(process.env.SMRT_DATA_DIR ?? process.cwd(), "data");
const SNAPSHOTS_FILE = join(DATA_DIR, "snapshots.json");

export interface NetworkSnapshot {
  id: string;
  capturedAt: string; // ISO
  networkId: string;
  networkName: string;
  stats: {
    total: number;
    online: number;
    offline: number;
    alerting: number;
    dormant: number;
    clientCount: number;
    healthScore: number; // Math.round(online/total*100)
  };
}

export function readSnapshots(): NetworkSnapshot[] {
  try {
    if (!existsSync(SNAPSHOTS_FILE)) return [];
    return JSON.parse(readFileSync(SNAPSHOTS_FILE, "utf-8")) as NetworkSnapshot[];
  } catch {
    return [];
  }
}

export function writeSnapshot(
  snapshot: Omit<NetworkSnapshot, "id" | "capturedAt">
): NetworkSnapshot {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const all = readSnapshots();
  const entry: NetworkSnapshot = {
    ...snapshot,
    id: uuidv4(),
    capturedAt: new Date().toISOString(),
  };
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recent = [...all, entry].filter(
    (s) => new Date(s.capturedAt) >= thirtyDaysAgo
  );
  const trimmed = recent.slice(-2000);
  writeFileSync(SNAPSHOTS_FILE, JSON.stringify(trimmed, null, 2));
  return entry;
}

export function getSnapshotsForNetwork(
  networkId: string,
  limit = 30
): NetworkSnapshot[] {
  return readSnapshots()
    .filter((s) => s.networkId === networkId)
    .slice(-limit);
}

export function getLatestSnapshot(networkId: string): NetworkSnapshot | null {
  const snaps = getSnapshotsForNetwork(networkId, 1);
  return snaps[0] ?? null;
}
