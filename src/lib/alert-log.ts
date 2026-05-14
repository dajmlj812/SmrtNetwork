import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

const DATA_DIR = join(process.cwd(), "data");
const ALERT_LOG_FILE = join(DATA_DIR, "alert-log.json");

export interface AlertLogEntry {
  id: string;
  timestamp: string; // ISO
  networkId: string;
  networkName: string;
  healthScore: number;
  threshold: number;
  channel: "email" | "slack" | "teams";
  success: boolean;
  error?: string;
}

export function readAlertLog(): AlertLogEntry[] {
  try {
    if (!existsSync(ALERT_LOG_FILE)) return [];
    return JSON.parse(readFileSync(ALERT_LOG_FILE, "utf-8")) as AlertLogEntry[];
  } catch {
    return [];
  }
}

export function writeAlertLogEntry(
  entry: Omit<AlertLogEntry, "id" | "timestamp">
): AlertLogEntry {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  const all = readAlertLog();
  const newEntry: AlertLogEntry = {
    ...entry,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
  };

  // Keep most recent 500
  const trimmed = [...all, newEntry].slice(-500);
  writeFileSync(ALERT_LOG_FILE, JSON.stringify(trimmed, null, 2));
  return newEntry;
}
