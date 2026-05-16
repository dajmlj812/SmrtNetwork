import { createHash } from "crypto";
import { readConfig } from "@/lib/config";

export type Role = "admin" | "readonly" | "none";

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
