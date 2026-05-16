import { NextRequest, NextResponse } from "next/server";
import {
  verifySession,
  issueSessionCookie,
  setSessionCookie,
  clearSessionCookie,
} from "@/lib/auth/session";
import {
  readConfig,
  getInactivityTimeoutMinutes,
  getSessionTimeoutSeconds,
} from "@/lib/config";

// Next.js 16's Proxy (formerly middleware) always runs on the Node.js
// runtime — no `export const runtime` needed (and specifying one is a
// build error). Node's `crypto` is therefore available to verifySession().

/**
 * Routes under /api/* that are reachable WITHOUT a valid session cookie.
 * Keep this list as tight as possible — every addition is a public attack
 * surface.
 *
 * - /api/auth/login   — has to be callable to log in
 * - /api/auth/logout  — idempotent, safe without auth
 * - /api/auth/config  — login page reads it pre-auth to know if LDAP is enabled
 * - /api/poller/status — container HEALTHCHECK + external monitoring endpoint;
 *                        intentionally discloses only enabled/threshold/cooldown/smtpConfigured
 */
const PUBLIC_API_PATHS = new Set<string>([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/config",
  "/api/poller/status",
]);

// Only re-sign the cookie if its embedded timestamp is at least this old.
// Avoids emitting Set-Cookie on every single request when an active user
// is hammering the API — a fresh cookie per second is wasteful and noisy
// in logs.
const COOKIE_REFRESH_THRESHOLD_MS = 30_000;

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PATHS.has(pathname);
}

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const res = NextResponse.next();

  // Layouts and pages read this to know which route they're rendering.
  res.headers.set("x-pathname", path);

  const isApi = path.startsWith("/api/");
  const cookieValue = request.cookies.get("smrt-session")?.value;

  // Public API endpoints: no auth needed, no session refresh.
  if (isApi && isPublicApi(path)) {
    return res;
  }

  // Public page routes (login). We don't auth-gate /login here; layout.tsx
  // owns page-level redirects. But we also don't want to refresh sessions
  // for visitors who aren't signed in.
  if (!isApi) {
    // Page paths are auth-gated in layout.tsx — fall through to the
    // shared refresh/expiry logic below so we can clear an expired cookie
    // before the layout sees it.
  }

  const verified = verifySession(cookieValue);

  // API requests with no/invalid session: reject. Page requests fall
  // through to layout.tsx which handles the redirect.
  if (verified === null) {
    if (isApi) {
      const out = NextResponse.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: {
            "WWW-Authenticate": "Cookie",
            "Cache-Control": "no-store",
          },
        }
      );
      if (cookieValue) clearSessionCookie(out, request);
      return out;
    }
    if (cookieValue) clearSessionCookie(res, request);
    return res;
  }

  // Open-mode deployments (no admin password) skip inactivity enforcement.
  if (verified.role === "none") {
    return res;
  }

  const inactivityMinutes = getInactivityTimeoutMinutes();
  const inactivityMs = inactivityMinutes * 60 * 1000;
  const now = Date.now();

  // Idle expiry: stale activity timestamp → revoke the session.
  if (
    inactivityMs > 0 &&
    verified.lastActivityAt !== null &&
    now - verified.lastActivityAt > inactivityMs
  ) {
    if (isApi) {
      const out = NextResponse.json(
        { error: "Session expired" },
        {
          status: 401,
          headers: {
            "WWW-Authenticate": "Cookie",
            "Cache-Control": "no-store",
          },
        }
      );
      clearSessionCookie(out, request);
      return out;
    }
    clearSessionCookie(res, request);
    return res;
  }

  // Sliding refresh: bump the embedded timestamp so the next request
  // measures idle from now. Skip if the cookie was issued so recently
  // that re-signing would just churn.
  const ageMs =
    verified.lastActivityAt === null
      ? Infinity
      : now - verified.lastActivityAt;

  if (ageMs > COOKIE_REFRESH_THRESHOLD_MS) {
    const signingKey = readConfig().appPasswordHash;
    if (signingKey && (verified.role === "admin" || verified.role === "readonly")) {
      const refreshed = issueSessionCookie(verified.role, signingKey, now);
      setSessionCookie(res, request, refreshed, getSessionTimeoutSeconds());
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
