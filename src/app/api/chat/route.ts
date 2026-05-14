import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { meraki } from "@/lib/meraki/client";
import { getAnthropicApiKey } from "@/lib/config";
import { SYSTEM_PROMPT } from "@/lib/claude/prompts";

const MODEL = "claude-sonnet-4-6";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  networkId: string;
  orgId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    const { messages, networkId, orgId } = body;

    if (!networkId || !orgId) {
      return new Response(JSON.stringify({ error: "networkId and orgId are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch network snapshot in parallel
    const [devices, statuses, clients, alertSettings] = await Promise.allSettled([
      meraki.devices.list(networkId),
      meraki.devices.getStatuses(orgId),
      meraki.clients.listByNetwork(networkId, 3600),
      meraki.alerts.getSettings(networkId),
    ]);

    const deviceList = devices.status === "fulfilled" ? devices.value : [];
    const statusList = statuses.status === "fulfilled" ? statuses.value : [];
    const clientList = clients.status === "fulfilled" ? clients.value : [];
    const alertData = alertSettings.status === "fulfilled" ? alertSettings.value : null;

    // Filter statuses to this network
    const networkSerials = new Set(deviceList.map((d) => d.serial));
    const networkStatuses = statusList.filter((s) => networkSerials.has(s.serial));

    // Build status map
    const statusMap = new Map<string, string>();
    for (const s of networkStatuses) {
      if (s.status) statusMap.set(s.serial, s.status);
    }

    // Build device summary
    const devicesSummary = deviceList.map((d) => ({
      serial: d.serial,
      name: d.name,
      model: d.model,
      status: statusMap.get(d.serial) ?? "unknown",
      lanIp: d.lanIp,
    }));

    // Alert summary
    const alertSummary = alertData
      ? {
          enabledAlerts: alertData.alerts.filter((a) => a.enabled).map((a) => a.type),
          disabledAlerts: alertData.alerts.filter((a) => !a.enabled).map((a) => a.type),
          defaultDestinations: alertData.defaultDestinations,
        }
      : null;

    const contextBlock = `Current Network Snapshot (${new Date().toLocaleString()}):
Network: ${networkId}
Devices: ${JSON.stringify(devicesSummary)}
Total clients: ${clientList.length}
Alert settings: ${JSON.stringify(alertSummary)}`;

    const client = new Anthropic({ apiKey: getAnthropicApiKey() });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = client.messages.stream({
            model: MODEL,
            max_tokens: 2048,
            system: [
              {
                type: "text",
                text: SYSTEM_PROMPT,
                cache_control: { type: "ephemeral" },
              },
              {
                type: "text",
                text: contextBlock,
                cache_control: { type: "ephemeral" },
              },
            ],
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          });

          for await (const event of anthropicStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(new TextEncoder().encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
