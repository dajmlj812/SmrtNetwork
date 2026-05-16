"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useNetwork } from "@/lib/context/NetworkContext";
import { MarkdownOutput } from "@/components/ui/MarkdownOutput";
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "What devices are offline?",
  "Who is using the most bandwidth?",
  "Are there any alerts I should know about?",
  "What's the overall health of this network?",
];

export function ChatPanel() {
  const { selectedNetwork, orgId } = useNetwork();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming || !selectedNetwork) return;

      const userMessage: Message = { role: "user", content: text.trim() };
      const assistantMessage: Message = { role: "assistant", content: "" };

      const nextMessages = [...messages, userMessage];
      setMessages([...nextMessages, assistantMessage]);
      setInput("");
      setIsStreaming(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages,
            networkId: selectedNetwork.id,
            orgId,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error("Failed to get response");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });

          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (updated[lastIdx]?.role === "assistant") {
              updated[lastIdx] = { role: "assistant", content: accumulated };
            }
            return updated;
          });
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.role === "assistant") {
            updated[lastIdx] = {
              role: "assistant",
              content: `Error: ${errMsg}`,
            };
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, selectedNetwork, orgId]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  if (!selectedNetwork) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted">
        <p className="text-sm">Select a network to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted text-sm">
            <p>Ask anything about your network</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-xl px-4 py-3",
                msg.role === "user"
                  ? "bg-accent-soft border border-accent/30 text-sm"
                  : "bg-card border"
              )}
            >
              {msg.role === "user" ? (
                <p className="text-sm text-foreground-strong">{msg.content}</p>
              ) : msg.content ? (
                <MarkdownOutput content={msg.content} />
              ) : (
                <div className="flex items-center gap-2 text-muted">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-xs">Thinking…</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Starter chips */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {STARTERS.map((s) => (
            <button
              key={s}
              onClick={() => void send(s)}
              disabled={isStreaming}
              className="text-xs px-3 py-1.5 rounded-full border bg-card text-foreground-muted hover:text-foreground-strong hover:border-strong transition-colors disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end border rounded-xl p-3 bg-card focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30 transition-colors">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your network… (Enter to send, Shift+Enter for newline)"
          disabled={isStreaming}
          rows={1}
          className="flex-1 bg-transparent text-sm text-foreground-strong placeholder:text-faint resize-none outline-none leading-relaxed max-h-32"
        />
        <button
          onClick={() => void send(input)}
          disabled={isStreaming || !input.trim()}
          className="p-2 rounded-lg bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-40 transition-colors shrink-0"
        >
          {isStreaming ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
    </div>
  );
}
