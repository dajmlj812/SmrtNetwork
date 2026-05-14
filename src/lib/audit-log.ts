import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const BASE_DIR = process.env.SMRT_DATA_DIR ?? process.cwd();
const DATA_DIR = join(BASE_DIR, "data");
const AUDIT_LOG_PATH = join(DATA_DIR, "audit-log.json");
const MAX_ENTRIES = 1000;

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
}

function readEntries(): AuditEntry[] {
  try {
    if (!existsSync(AUDIT_LOG_PATH)) return [];
    return JSON.parse(readFileSync(AUDIT_LOG_PATH, "utf-8")) as AuditEntry[];
  } catch {
    return [];
  }
}

export function appendAuditEntry(action: string, details: string): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    const entries = readEntries();
    entries.push({ id: randomUUID(), timestamp: new Date().toISOString(), action, details });
    if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
    writeFileSync(AUDIT_LOG_PATH, JSON.stringify(entries, null, 2));
  } catch {
    // Non-fatal
  }
}

export function listAuditLog(): AuditEntry[] {
  return readEntries().slice().reverse();
}

export function clearAuditLog(): void {
  writeFileSync(AUDIT_LOG_PATH, "[]");
}

export function exportAuditLogCsv(): string {
  const entries = listAuditLog();
  const rows = [
    ["ID", "Timestamp", "Action", "Details"].join(","),
    ...entries.map((e) =>
      [e.id, e.timestamp, `"${e.action}"`, `"${e.details.replace(/"/g, '""')}"`].join(",")
    ),
  ];
  return rows.join("\n");
}
