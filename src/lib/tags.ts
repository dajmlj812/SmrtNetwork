import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const BASE_DIR = process.env.SMRT_DATA_DIR ?? process.cwd();
const DATA_DIR = join(BASE_DIR, "data");
const TAGS_PATH = join(DATA_DIR, "client-tags.json");

export interface ClientTag {
  label: string;
  group?: string;
}

export type TagMap = Record<string, ClientTag>;

function readTags(): TagMap {
  try {
    if (!existsSync(TAGS_PATH)) return {};
    return JSON.parse(readFileSync(TAGS_PATH, "utf-8")) as TagMap;
  } catch {
    return {};
  }
}

function writeTags(tags: TagMap): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(TAGS_PATH, JSON.stringify(tags, null, 2));
}

export function getAllTags(): TagMap {
  return readTags();
}

export function getTagByMac(mac: string): ClientTag | null {
  return readTags()[mac.toLowerCase()] ?? null;
}

export function upsertTag(mac: string, tag: ClientTag): void {
  const tags = readTags();
  tags[mac.toLowerCase()] = tag;
  writeTags(tags);
}

export function removeTag(mac: string): void {
  const tags = readTags();
  delete tags[mac.toLowerCase()];
  writeTags(tags);
}
