"use client";

import { ChatPanel } from "@/components/chat/ChatPanel";

export default function ChatPage() {
  return (
    <div className="flex flex-col h-full">
      <h1 className="text-2xl font-bold tracking-tight text-foreground-strong mb-6">Ask AI</h1>
      <div className="flex-1 overflow-hidden">
        <ChatPanel />
      </div>
    </div>
  );
}
