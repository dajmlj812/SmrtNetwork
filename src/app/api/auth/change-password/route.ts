import { NextRequest, NextResponse } from "next/server";
import { writeConfig } from "@/lib/config";
import { createHash } from "crypto";

export async function POST(req: NextRequest) {
  const { newPassword } = (await req.json()) as { newPassword: string };

  if (!newPassword) {
    writeConfig({ appPasswordHash: undefined });
  } else {
    const hash = createHash("sha256").update(newPassword).digest("hex");
    writeConfig({ appPasswordHash: hash });
  }

  return NextResponse.json({ ok: true });
}
