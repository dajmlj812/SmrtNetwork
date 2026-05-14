import { NextRequest, NextResponse } from "next/server";
import { getAllTags, getTagByMac, upsertTag, removeTag } from "@/lib/tags";
import type { ClientTag } from "@/lib/tags";

export async function GET(req: NextRequest) {
  const mac = req.nextUrl.searchParams.get("mac");
  if (mac) {
    const tag = getTagByMac(mac);
    return NextResponse.json(tag ?? null);
  }
  return NextResponse.json(getAllTags());
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { mac: string; label?: string; group?: string };
  if (!body.mac) return NextResponse.json({ error: "mac required" }, { status: 400 });
  const tag: ClientTag = { label: body.label ?? "", group: body.group };
  upsertTag(body.mac, tag);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const mac = req.nextUrl.searchParams.get("mac");
  if (!mac) return NextResponse.json({ error: "mac required" }, { status: 400 });
  removeTag(mac);
  return NextResponse.json({ ok: true });
}
