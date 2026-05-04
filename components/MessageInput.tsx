"use client";

import { Mic, Paperclip, Send, Smile, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import LanguageToggle from "./LanguageToggle";
import type { Language } from "@/lib/types";

interface MessageInputProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onSend: (text: string, imageDataUrl?: string) => void;
  disabled?: boolean;
  draft?: { text: string; imageDataUrl?: string } | null;
  onConsumeDraft?: () => void;
  onPickImage?: (file: File) => Promise<string | null>;
}

export default function MessageInput({
  language,
  onLanguageChange,
  onSend,
  disabled,
  draft,
  onConsumeDraft,
  onPickImage,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState<string | undefined>(undefined);
  const [extracting, setExtracting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Apply external draft (from demo scenarios or auto-extracted question)
  useEffect(() => {
    if (draft) {
      setText(draft.text || "");
      setPendingImage(draft.imageDataUrl);
      onConsumeDraft?.();
      requestAnimationFrame(() => taRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [text]);

  function send() {
    const trimmed = text.trim();
    if (!trimmed && !pendingImage) return;
    onSend(trimmed, pendingImage);
    setText("");
    setPendingImage(undefined);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (onPickImage) {
      setExtracting(true);
      try {
        const dataUrl = await onPickImage(f);
        if (dataUrl) setPendingImage(dataUrl);
      } finally {
        setExtracting(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => setPendingImage(reader.result as string);
      reader.readAsDataURL(f);
    }
    e.target.value = "";
  }

  return (
    <div className="bg-whatsapp-chatBg border-t border-black/5 px-2 pt-1.5 pb-2">
      <div className="flex justify-center mb-1.5">
        <LanguageToggle value={language} onChange={onLanguageChange} />
      </div>

      {pendingImage && (
        <div className="mx-1 mb-1.5 inline-flex items-start gap-2 bg-white rounded-md p-1.5 shadow-sm border border-black/5">
          <img
            src={pendingImage}
            alt="Attachment preview"
            className="w-14 h-14 object-cover rounded"
          />
          <div className="text-[11px] text-whatsapp-textSecondary self-center">
            {extracting ? "Reading question…" : "Attached"}
          </div>
          <button
            onClick={() => setPendingImage(undefined)}
            className="self-start text-whatsapp-textSecondary hover:text-red-600"
            aria-label="Remove image"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-1.5">
        <div className="flex-1 bg-white rounded-3xl shadow-sm flex items-end px-2 py-1 gap-1.5">
          <button
            className="text-whatsapp-textSecondary hover:text-whatsapp-textPrimary p-1"
            aria-label="Emoji"
            tabIndex={-1}
          >
            <Smile size={22} />
          </button>
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={
              language === "kn"
                ? "ಸಂದೇಶ ಟೈಪ್ ಮಾಡಿ"
                : language === "hi"
                  ? "संदेश लिखें"
                  : "Type a message"
            }
            className="flex-1 resize-none bg-transparent outline-none text-[14.5px] py-1.5 max-h-[120px] leading-snug"
            disabled={disabled}
          />
          <button
            className="text-whatsapp-textSecondary hover:text-whatsapp-textPrimary p-1"
            aria-label="Attach file"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || extracting}
          >
            <Paperclip size={22} className="-rotate-45" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        {text.trim() || pendingImage ? (
          <button
            onClick={send}
            disabled={disabled}
            className="w-11 h-11 rounded-full bg-whatsapp-header hover:bg-whatsapp-headerDark text-white flex items-center justify-center shadow disabled:opacity-50 shrink-0"
            aria-label="Send"
          >
            <Send size={20} />
          </button>
        ) : (
          <button
            className="w-11 h-11 rounded-full bg-whatsapp-header text-white flex items-center justify-center shadow shrink-0"
            aria-label="Voice message"
            tabIndex={-1}
          >
            <Mic size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
