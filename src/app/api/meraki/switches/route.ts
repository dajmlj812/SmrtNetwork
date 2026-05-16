import { NextRequest } from "next/server";
import { meraki } from "@/lib/meraki/client";
import type { SwitchPort, SwitchPortStatus } from "@/lib/meraki/types";

export interface SwitchData {
  serial: string;
  name: string;
  model: string;
  ports: SwitchPort[];
  statuses: SwitchPortStatus[];
}

/** Streamed event envelope sent as NDJSON to the client. */
export type SwitchStreamEvent =
  | { type: "start"; total: number }
  | { type: "switch"; data: SwitchData; elapsedMs: number }
  | { type: "error"; serial: string; message: string }
  | { type: "done"; totalMs: number; ok: number; failed: number }
  | { type: "fatal"; message: string };

/** Run `tasks` with at most `limit` in flight at once. */
async function runWithConcurrency<T>(
  tasks: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  let cursor = 0;
  async function pull() {
    while (cursor < tasks.length) {
      const i = cursor++;
      await worker(tasks[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, pull));
}

export async function GET(req: NextRequest) {
  const networkId = req.nextUrl.searchParams.get("networkId");
  if (!networkId) {
    return new Response(JSON.stringify({ error: "networkId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const t0 = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: SwitchStreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        const devices = await meraki.devices.list(networkId);
        const switches = devices.filter((d) => d.model.startsWith("MS"));

        console.log(`[switches] networkId=${networkId} switches=${switches.length} starting (streamed)`);
        send({ type: "start", total: switches.length });

        let ok = 0;
        let failed = 0;

        // Concurrency 4 keeps us under Meraki's 10 req/s limit
        // (4 switches × 2 endpoints = 8 in-flight).
        await runWithConcurrency(switches, 4, async (sw) => {
          const swStart = Date.now();
          try {
            const [ports, statuses] = await Promise.all([
              meraki.switchPorts.list(sw.serial),
              meraki.switchPorts.statuses(sw.serial),
            ]);
            const elapsed = Date.now() - swStart;
            console.log(
              `[switches]   ${sw.serial} (${sw.name ?? "-"}) ports=${ports.length} in ${elapsed}ms`
            );
            send({
              type: "switch",
              data: {
                serial: sw.serial,
                name: sw.name ?? sw.serial,
                model: sw.model,
                ports,
                statuses,
              },
              elapsedMs: elapsed,
            });
            ok++;
          } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            console.warn(
              `[switches]   ${sw.serial} (${sw.name ?? "-"}) failed after ${Date.now() - swStart}ms: ${message}`
            );
            send({ type: "error", serial: sw.serial, message });
            failed++;
          }
        });

        const totalMs = Date.now() - t0;
        console.log(
          `[switches] networkId=${networkId} done — ${ok}/${switches.length} ok, ${failed} failed in ${totalMs}ms`
        );
        send({ type: "done", totalMs, ok, failed });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`[switches] networkId=${networkId} fatal after ${Date.now() - t0}ms: ${message}`);
        send({ type: "fatal", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
