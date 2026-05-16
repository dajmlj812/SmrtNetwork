import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";

export type Role = "admin" | "readonly" | "none";

export interface VerifiedSession {
  role: Role;
  /**
   * Millisecond timestamp the cookie claims for the user's last activity.
   * `null` means the cookie carries no activity claim — either because the
   * deployment runs in open mode (no password, role==='none') or because
   * the cookie is in the pre-timestamp legacy format. Callers that want to
   * enforce idle expiry should treat `null` as "unknown, grant one grace
   * request" and refresh the cookie to the new format.
   */
  lastActivityAt: number | null;
}

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
 * Build the cookie value for a newly-issued or refreshed session. The
 * format embeds an HMAC-signed activity timestamp so the middleware can
 * enforce an inactivity timeout without keeping server-side session state.
 *
 *   <role>:<roleHash>:<tsBase36>:<sig>
 *
 * `sig` is HMAC-SHA256 over `role|roleHash|tsBase36`, keyed by the same
 * `appPasswordHash` we use for the role hash itself. Bumping the activity
 * timestamp therefore requires possession of the server's signing key —
 * the client cannot forge a fresh timestamp on a stolen cookie.
 */
export function issueSessionCookie(
  role: "admin" | "readonly",
  signingKey: string,
  now: number = Date.now()
): string {
  const suffix =
    role === "admin"
      ? "smrt-session-admin-v1"
      : "smrt-session-readonly-v1";
  const roleHash = expectedHash(signingKey, suffix);
  const tsBase36 = now.toString(36);
  const sig = activitySig(signingKey, role, roleHash, tsBase36);
  return `${role}:${roleHash}:${tsBase36}:${sig}`;
}

/**
 * Verify a `smrt-session` cookie value.
 *
 * Returns:
 *   - { role: 'admin'|'readonly', lastActivityAt } — valid signed session
 *   - { role: 'none',             lastActivityAt: null } — open-mode deployment
 *   - null — invalid / missing / tampered
 *
 * This function only checks signature validity; it does NOT enforce the
 * inactivity window. Callers that want to enforce idle expiry should
 * compare `lastActivityAt` against `getInactivityTimeoutMinutes()` and
 * reject themselves — keeping policy at the call site lets the middleware
 * differentiate between an "expired session" 401 and an "invalid cookie"
 * 401, and lets the layout decide whether to redirect.
 */
export function verifySession(
  cookieValue: string | undefined
): VerifiedSession | null {
  const cfg = readConfig();

  // Open mode: no admin password configured → everyone is admin.
  if (!cfg.appPasswordHash) {
    return { role: "none", lastActivityAt: null };
  }

  const session = cookieValue ?? "";
  if (!session) return null;

  const adminKey = cfg.appPasswordHash;
  const parts = session.split(":");

  // Reject open-mode cookies once a password has been set.
  if (session === "open:admin") return null;

  // New format with activity timestamp: <role>:<roleHash>:<ts>:<sig>
  if (parts.length === 4 && (parts[0] === "admin" || parts[0] === "readonly")) {
    const [role, roleHash, tsStr, sig] = parts;
    const suffix =
      role === "admin"
        ? "smrt-session-admin-v1"
        : "smrt-session-readonly-v1";
    if (roleHash !== expectedHash(adminKey, suffix)) return null;
    const expectedSig = activitySig(adminKey, role, roleHash, tsStr);
    if (!constantTimeEqual(sig, expectedSig)) return null;
    const ts = parseInt(tsStr, 36);
    if (!Number.isFinite(ts) || ts <= 0) return null;
    return { role: role as Role, lastActivityAt: ts };
  }

  // Legacy format without timestamp: <role>:<roleHash>
  if (parts.length === 2 && (parts[0] === "admin" || parts[0] === "readonly")) {
    const [role, roleHash] = parts;
    const suffix =
      role === "admin"
        ? "smrt-session-admin-v1"
        : "smrt-session-readonly-v1";
    if (roleHash !== expectedHash(adminKey, suffix)) return null;
    return { role: role as Role, lastActivityAt: null };
  }

  // Legacy pre-role-prefix format — grant admin if valid.
  if (session === expectedHash(adminKey, "smrt-session-v1")) {
    return { role: "admin", lastActivityAt: null };
  }

  return null;
}

function expectedHash(signingKey: string, suffix: string): string {
  return createHash("sha256").update(signingKey + suffix).digest("hex");
}

function activitySig(
  signingKey: string,
  role: string,
  roleHash: string,
  tsBase36: string
): string {
  return createHmac("sha256", signingKey)
    .update(`${role}|${roleHash}|${tsBase36}`)
    .digest("hex");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}
