import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./prompts";
import { getAnthropicApiKey } from "@/lib/config";

const MODEL = "claude-sonnet-4-6";

function getClient() {
  return new Anthropic({ apiKey: getAnthropicApiKey() });
}

export async function analyzeWithClaude(userPrompt: string): Promise<string> {
  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type from Claude");
  return block.text;
}

export async function streamAnalysis(
  userPrompt: string,
  onChunk: (text: string) => void
): Promise<void> {
  const stream = getClient().messages.stream({
    model: MODEL,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      onChunk(chunk.delta.text);
    }
  }
}
