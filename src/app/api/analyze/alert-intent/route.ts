import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey } from "@/lib/config";
import { meraki } from "@/lib/meraki/client";
import { getActiveOrgId } from "@/lib/config";

export interface AlertIntentResult {
  networkId: string | null;
  networkName: string | null;
  threshold: number;
  channels: string[];
  description: string;
  confidence: "high" | "medium" | "low";
  raw: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { prompt?: string; orgId?: string };
  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const orgId = body.orgId ?? getActiveOrgId();

  let networksContext = "";
  try {
    const networks = await meraki.networks.list(orgId);
    networksContext = networks
      .map((n) => `- ${n.name} (id: ${n.id})`)
      .join("\n");
  } catch {
    networksContext = "(could not load networks)";
  }

  const systemPrompt = `You are an alert configuration assistant for SmrtNetwork, a Cisco Meraki network monitoring tool.
Given a natural language description of an alert the user wants to create, extract the intent and respond with ONLY a valid JSON object — no markdown, no explanation.

Available networks:
${networksContext}

Available alert channels: email, slack, teams, webhook, servicenow

JSON schema:
{
  "networkId": "<network id or null for all networks>",
  "networkName": "<network name or null>",
  "threshold": <integer 0-100, health score below which to alert>,
  "channels": ["<channel>"],
  "description": "<one-sentence summary of what this alert does>",
  "confidence": "high" | "medium" | "low"
}

Rules:
- threshold defaults to 80 if not specified
- If the user names a specific network, match it from the list above
- If no network is specified, set networkId and networkName to null (means all networks)
- channels defaults to ["email"] if not specified
- confidence is "high" if all fields are clearly specified, "medium" if some are inferred, "low" if very uncertain`;

  try {
    const client = new Anthropic({ apiKey: getAnthropicApiKey() });
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0];
    if (text.type !== "text") throw new Error("Unexpected response type");

    let parsed: Omit<AlertIntentResult, "raw">;
    try {
      parsed = JSON.parse(text.text) as Omit<AlertIntentResult, "raw">;
    } catch {
      return NextResponse.json(
        { error: "Failed to parse Claude response", raw: text.text },
        { status: 422 }
      );
    }

    return NextResponse.json({ ...parsed, raw: text.text } satisfies AlertIntentResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
