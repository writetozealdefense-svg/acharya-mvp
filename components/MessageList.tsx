"use client";

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import type { ChatMessage } from "@/lib/types";

interface MessageListProps {
  messages: ChatMessage[];
  showConsensus: boolean;
}

export default function MessageList({ messages, showConsensus }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, showConsensus]);

  return (
    <div className="chat-scroll flex-1 overflow-y-auto bg-whatsapp-chatBg bg-whatsapp-pattern py-2">
      {messages.length === 0 && (
        <div className="text-center text-whatsapp-textSecondary text-sm mt-10 px-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5 inline-block max-w-sm shadow-sm">
            👋 Ask Acharya anything from your textbook —{" "}
            <span className="font-semibold">in Kannada, Hindi, or English</span>.
            Every answer is checked across 3 AI models for accuracy.
          </div>
        </div>
      )}
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} showConsensus={showConsensus} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
