import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

const DATA_DIR = join(process.env.SMRT_DATA_DIR ?? process.cwd(), "data");
const HISTORY_FILE = join(DATA_DIR, "report-history.json");
const MAX_REPORTS = 15;

export interface ReportHistoryEntry {
  id: string;
  generatedAt: string;
  title: string;
  scope: "org" | string; // "org" or networkId
  html: string;
}

export type ReportHistoryMeta = Omit<ReportHistoryEntry, "html">;

function readAll(): ReportHistoryEntry[] {
  try {
    if (!existsSync(HISTORY_FILE)) return [];
    return JSON.parse(readFileSync(HISTORY_FILE, "utf-8")) as ReportHistoryEntry[];
  } catch {
    return [];
  }
}

export function listReportHistory(): ReportHistoryMeta[] {
  return readAll()
    .map(({ html: _, ...meta }) => meta)
    .reverse(); // most recent first
}

export function saveReport(
  entry: Omit<ReportHistoryEntry, "id" | "generatedAt">
): ReportHistoryEntry {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  const all = readAll();
  const saved: ReportHistoryEntry = {
    ...entry,
    id: uuidv4(),
    generatedAt: new Date().toISOString(),
  };

  writeFileSync(
    HISTORY_FILE,
    JSON.stringify([...all, saved].slice(-MAX_REPORTS), null, 2)
  );
  return saved;
}

export function getReportById(id: string): ReportHistoryEntry | null {
  return readAll().find((r) => r.id === id) ?? null;
}
