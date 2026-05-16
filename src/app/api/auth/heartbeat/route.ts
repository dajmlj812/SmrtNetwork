import { NextResponse } from "next/server";

/**
 * No-op auth heartbeat. The proxy middleware verifies the session cookie
 * and slides its activity timestamp forward on every authenticated request
 * — this endpoint exists so the client can deliberately ping the server
 * when the user is actively interacting with the page but not otherwise
 * generating API traffic (e.g. typing in a long form). Without it, the
 * server-side inactivity timer would expire even while the client
 * watcher considers the user active.
 */
export async function POST() {
  return NextResponse.json({ ok: true });
}
