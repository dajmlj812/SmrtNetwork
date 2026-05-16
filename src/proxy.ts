import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";

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

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PATHS.has(pathname);
}

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const res = NextResponse.next();

  // Layouts and pages read this to know which route they're rendering.
  res.headers.set("x-pathname", path);

  // Page routes (everything not under /api/*) are auth-gated in layout.tsx
  // already. We only enforce on /api/* here.
  if (!path.startsWith("/api/")) {
    return res;
  }

  if (isPublicApi(path)) {
    return res;
  }

  const role = verifySession(request.cookies.get("smrt-session")?.value);
  if (role === null) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          // Suppresses browser basic-auth prompts on stray fetches
          "WWW-Authenticate": "Cookie",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
