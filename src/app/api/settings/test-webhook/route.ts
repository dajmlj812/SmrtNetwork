import { NextRequest, NextResponse } from "next/server";
import { getWebhookConfig } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { channel: "slack" | "teams" };
    const { channel } = body;

    if (channel !== "slack" && channel !== "teams") {
      return NextResponse.json({ ok: false, error: "Invalid channel" }, { status: 400 });
    }

    const webhooks = getWebhookConfig();
    const urls = channel === "slack" ? webhooks.slack : webhooks.teams;

    if (urls.length === 0) {
      return NextResponse.json(
        { ok: false, error: `${channel === "slack" ? "Slack" : "Teams"} webhook URL is not configured` },
        { status: 400 }
      );
    }

    // Test the first URL
    const url = urls[0];

    if (channel === "slack") {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "✅ *SmrtNetwork* — this is a test message from your webhook configuration." }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return NextResponse.json({ ok: false, error: `Slack responded ${res.status}: ${text}` }, { status: 502 });
      }
      return NextResponse.json({ ok: true });
    }

    // Teams
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        themeColor: "0076D7",
        summary: "SmrtNetwork test message",
        title: "SmrtNetwork — Test Message",
        text: "This is a test message from your SmrtNetwork webhook configuration.",
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({ ok: false, error: `Teams responded ${res.status}: ${text}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
