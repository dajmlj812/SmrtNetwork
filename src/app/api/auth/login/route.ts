import { NextRequest, NextResponse } from "next/server";
import { readConfig, getLdapConfig, getSessionTimeoutSeconds } from "@/lib/config";
import { createHash } from "crypto";
import { appendAuditEntry } from "@/lib/audit-log";
import { setSessionCookie } from "@/lib/auth/session";

function makeSessionCookie(signingHash: string, suffix: string, role: string): string {
  const hash = createHash("sha256").update(signingHash + suffix).digest("hex");
  return `${role}:${hash}`;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { password: string; username?: string };
  const { password, username } = body;
  const cfg = readConfig();
  const maxAge = getSessionTimeoutSeconds();

  // No admin password set — open access
  if (!cfg.appPasswordHash) {
    const res = NextResponse.json({ ok: true, role: "admin" });
    setSessionCookie(res, req, "open:admin", maxAge);
    return res;
  }

  // LDAP auth when enabled and username provided
  if (cfg.ldapEnabled && cfg.ldapUrl && cfg.ldapBaseDn && username?.trim()) {
    const { authenticateWithLdap } = await import("@/lib/ldap");
    const ldap = getLdapConfig();
    const result = await authenticateWithLdap({
      url: ldap.url,
      baseDn: ldap.baseDn,
      bindDn: ldap.bindDn,
      bindPassword: ldap.bindPassword,
      userFilter: ldap.userFilter,
      username: username.trim(),
      password,
      adminGroup: ldap.adminGroup,
      readonlyGroup: ldap.readonlyGroup,
    });

    if (!result.success) {
      appendAuditEntry("auth.login_failed", `LDAP: ${username} — ${result.error ?? "unknown"}`);
      return NextResponse.json({ error: result.error ?? "Authentication failed" }, { status: 401 });
    }

    const suffix = result.role === "admin" ? "smrt-session-admin-v1" : "smrt-session-readonly-v1";
    const cookie = makeSessionCookie(cfg.appPasswordHash, suffix, result.role);
    const res = NextResponse.json({ ok: true, role: result.role });
    setSessionCookie(res, req, cookie, maxAge);
    appendAuditEntry("auth.login", `LDAP login: ${username} (role: ${result.role})`);
    return res;
  }

  // PIN auth — check admin password
  const inputHash = createHash("sha256").update(password).digest("hex");
  if (inputHash === cfg.appPasswordHash) {
    const cookie = makeSessionCookie(cfg.appPasswordHash, "smrt-session-admin-v1", "admin");
    const res = NextResponse.json({ ok: true, role: "admin" });
    setSessionCookie(res, req, cookie, maxAge);
    appendAuditEntry("auth.login", "Admin login (PIN)");
    return res;
  }

  // Check read-only password
  if (cfg.readonlyPasswordHash && inputHash === cfg.readonlyPasswordHash) {
    const cookie = makeSessionCookie(cfg.appPasswordHash, "smrt-session-readonly-v1", "readonly");
    const res = NextResponse.json({ ok: true, role: "readonly" });
    setSessionCookie(res, req, cookie, maxAge);
    appendAuditEntry("auth.login", "Read-only login (PIN)");
    return res;
  }

  appendAuditEntry("auth.login_failed", "Invalid PIN attempt");
  return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
}
