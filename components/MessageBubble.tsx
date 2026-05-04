"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Check, CheckCheck } from "lucide-react";
import VerdictBadge from "./VerdictBadge";
import ConsensusPanel from "./ConsensusPanel";
import type { ChatMessage } from "@/lib/types";

interface MessageBubbleProps {
  message: ChatMessage;
  showConsensus: boolean;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ message, showConsensus }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="w-full flex justify-end px-3 my-1">
        <div
          className={`bubble-out max-w-[78%] bg-whatsapp-bubbleIn text-whatsapp-textPrimary rounded-lg rounded-br-none shadow-sm px-2.5 py-1.5 text-[14.2px]`}
        >
          {message.imageDataUrl && (
            <img
              src={message.imageDataUrl}
              alt="Uploaded"
              className="max-w-[260px] max-h-[260px] rounded mb-1.5 block"
            />
          )}
          {message.content && (
            <div className="md-body whitespace-pre-wrap break-words leading-snug">
              {message.content}
            </div>
          )}
          <div className="flex items-center justify-end gap-1 mt-0.5 text-[10px] text-whatsapp-textSecondary">
            <span>{formatTime(message.createdAt)}</span>
            <CheckCheck size={14} className="text-whatsapp-tick" />
          </div>
        </div>
      </div>
    );
  }

  // Assistant
  return (
    <div className="w-full flex justify-start px-3 my-1">
      <div className="max-w-[88%] flex flex-col items-start gap-1">
        <div className="bubble-in bg-whatsapp-bubbleOut text-whatsapp-textPrimary rounded-lg rounded-bl-none shadow-sm px-2.5 py-1.5 text-[14.2px] relative">
          {message.verdict && (
            <div className="float-right ml-2 -mt-0.5">
              <VerdictBadge verdict={message.verdict} />
            </div>
          )}
          {message.pending ? (
            <div className="flex items-center gap-1 py-1.5 pr-3">
              <span className="typing-dot inline-block w-1.5 h-1.5 rounded-full bg-whatsapp-textSecondary" />
              <span className="typing-dot inline-block w-1.5 h-1.5 rounded-full bg-whatsapp-textSecondary" />
              <span className="typing-dot inline-block w-1.5 h-1.5 rounded-full bg-whatsapp-textSecondary" />
            </div>
          ) : (
            <div className="md-body break-words leading-snug">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          {!message.pending && (
            <div className="flex items-center justify-end gap-1 mt-0.5 text-[10px] text-whatsapp-textSecondary clear-both">
              <span>{formatTime(message.createdAt)}</span>
              <Check size={12} />
            </div>
          )}
        </div>

        {showConsensus && message.reasoning && !message.pending && (
          <ConsensusPanel reasoning={message.reasoning} verdict={message.verdict} />
        )}
      </div>
    </div>
  );
}
