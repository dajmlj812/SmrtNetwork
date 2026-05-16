import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";

export type Role = "admin" | "readonly" | "none";

/**
 * Set the `smrt-session` cookie with hardened flags.
 *
 * `Secure` is only set when the request was actually served over HTTPS —
 * either directly or via a forwarding proxy (NPM, Cloudflare, etc.). This
 * keeps the desktop exe / dev server (HTTP on localhost) working while
 * locking the cookie down in production where TLS is terminated upstream.
 *
 * Always sets:
 *   - HttpOnly  → JavaScript cannot read the cookie (mitigates XSS theft)
 *   - SameSite=Lax → not sent on cross-site POSTs (mitigates CSRF)
 *   - Path=/    → all routes
 */
export function setSessionCookie(
  res: NextResponse,
  request: NextRequest,
  value: string,
  maxAgeSeconds: number
): void {
  res.cookies.set("smrt-session", value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
    secure: isSecureRequest(request),
  });
}

/**
 * Clear the `smrt-session` cookie. Matches setSessionCookie's flags so the
 * browser actually replaces the existing cookie (mismatched flags can leave
 * the original entry behind).
 */
export function clearSessionCookie(
  res: NextResponse,
  request: NextRequest
): void {
  res.cookies.set("smrt-session", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: isSecureRequest(request),
  });
}

function isSecureRequest(request: NextRequest): boolean {
  if (request.nextUrl.protocol === "https:") return true;
  const forwarded = request.headers.get("x-forwarded-proto");
  return forwarded === "https" || forwarded?.split(",")[0].trim() === "https";
}

/**
 * Verify a `smrt-session` cookie value and return the role it represents.
 *
 * Returns:
 *   - "admin" / "readonly" — valid session for that role
 *   - "none"               — no auth required because no app password is set
 *                            (open-mode deployment)
 *   - null                 — invalid / missing / tampered session
 *
 * This is the single source of truth for session verification. It is used
 * by both the page-render layout (`src/app/layout.tsx`) and the API auth
 * gate in middleware (`src/proxy.ts`) — keeping the logic identical so the
 * two cannot drift.
 */
export function verifySession(
  cookieValue: string | undefined
): Role | null {
  const cfg = readConfig();

  // Open mode: no admin password configured → everyone is admin.
  if (!cfg.appPasswordHash) {
    return "none";
  }

  const session = cookieValue ?? "";
  if (!session) return null;

  const adminKey = cfg.appPasswordHash;

  if (session.startsWith("admin:")) {
    const hash = session.slice("admin:".length);
    return hash === expectedHash(adminKey, "smrt-session-admin-v1")
      ? "admin"
      : null;
  }

  if (session.startsWith("readonly:")) {
    const hash = session.slice("readonly:".length);
    return hash === expectedHash(adminKey, "smrt-session-readonly-v1")
      ? "readonly"
      : null;
  }

  if (session === "open:admin") {
    // A cookie issued during a past open-mode session, before a password
    // was set. Reject — the operator has since locked the app down.
    return null;
  }

  // Legacy session format (pre-role-prefix) — grant admin if valid.
  if (session === expectedHash(adminKey, "smrt-session-v1")) {
    return "admin";
  }

  return null;
}

function expectedHash(signingKey: string, suffix: string): string {
  return createHash("sha256").update(signingKey + suffix).digest("hex");
}
