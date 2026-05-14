import { NextRequest, NextResponse } from "next/server";
import { writeConfig } from "@/lib/config";
import { createHash } from "crypto";
import { appendAuditEntry } from "@/lib/audit-log";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    newPassword?: string;
    newReadonlyPassword?: string;
    removeReadonly?: boolean;
  };

  if (body.removeReadonly) {
    writeConfig({ readonlyPasswordHash: undefined });
    appendAuditEntry("auth.readonly_password_removed", "Read-only password removed");
    return NextResponse.json({ ok: true });
  }

  if (typeof body.newReadonlyPassword === "string") {
    if (!body.newReadonlyPassword) {
      writeConfig({ readonlyPasswordHash: undefined });
      appendAuditEntry("auth.readonly_password_removed", "Read-only password removed");
    } else {
      const hash = createHash("sha256").update(body.newReadonlyPassword).digest("hex");
      writeConfig({ readonlyPasswordHash: hash });
      appendAuditEntry("auth.readonly_password_changed", "Read-only password updated");
    }
    return NextResponse.json({ ok: true });
  }

  if (typeof body.newPassword === "string") {
    if (!body.newPassword) {
      writeConfig({ appPasswordHash: undefined });
      appendAuditEntry("auth.admin_password_removed", "Admin password removed — app is now open");
    } else {
      const hash = createHash("sha256").update(body.newPassword).digest("hex");
      writeConfig({ appPasswordHash: hash });
      appendAuditEntry("auth.admin_password_changed", "Admin password updated");
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
}
