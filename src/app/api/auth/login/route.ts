import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { createHash } from "crypto";

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password: string };
  const cfg = readConfig();

  if (!cfg.appPasswordHash) {
    return NextResponse.json({ ok: true });
  }

  const inputHash = createHash("sha256").update(password).digest("hex");
  if (inputHash !== cfg.appPasswordHash) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const session = createHash("sha256")
    .update(inputHash + "smrt-session-v1")
    .digest("hex");

  const res = NextResponse.json({ ok: true });
  res.cookies.set("smrt-session", session, {
    httpOnly: true,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
