"use client";

import { useEffect, useState } from "react";
import ChatHeader from "@/components/ChatHeader";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import scenariosJson from "@/data/demo-scenarios.json";
import type { ChatMessage, Language } from "@/lib/types";

interface DemoScenario {
  id: string;
  label: string;
  language: Language;
  question: string;
  english_gloss: string;
  imageUrl: string | null;
  forceHallucinationDemo: boolean;
  blurb: string;
}
const SCENARIOS = scenariosJson as DemoScenario[];

async function svgUrlToPngDataUrl(url: string): Promise<string> {
  // Fetch the SVG (or any image) and rasterize it to a PNG data URL via canvas.
  // Works because <img> can load SVG and canvas.toDataURL exports PNG.
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = (e) => reject(e);
    i.src = url;
  });
  const w = img.naturalWidth || 600;
  const h = img.naturalHeight || 800;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.fillStyle = "#fdf6e7";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}

const STORAGE_KEY_MESSAGES = "acharya.messages.v1";
const STORAGE_KEY_LANG = "acharya.lang.v1";
const STORAGE_KEY_CONSENSUS = "acharya.showConsensus.v1";

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [language, setLanguage] = useState<Language>("en");
  const [showConsensus, setShowConsensus] = useState(false);
  const [draft, setDraft] = useState<{ text: string; imageDataUrl?: string } | null>(
    null,
  );
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const m = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (m) setMessages(JSON.parse(m));
      const l = localStorage.getItem(STORAGE_KEY_LANG) as Language | null;
      if (l) setLanguage(l);
      const sc = localStorage.getItem(STORAGE_KEY_CONSENSUS);
      if (sc) setShowConsensus(sc === "1");
    } catch {
      /* ignore corrupted storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  }, [messages, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY_LANG, language);
  }, [language, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY_CONSENSUS, showConsensus ? "1" : "0");
  }, [showConsensus, hydrated]);

  function handleSend(
    text: string,
    imageDataUrl?: string,
    extras?: { forceHallucinationDemo?: boolean },
  ) {
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: text,
      imageDataUrl,
      language,
      createdAt: Date.now(),
    };
    const placeholder: ChatMessage = {
      id: uid(),
      role: "assistant",
      content: "",
      createdAt: Date.now() + 1,
      pending: true,
      verdict: "Pending",
    };
    setMessages((prev) => [...prev, userMsg, placeholder]);

    void askAcharya({
      question: text,
      language,
      placeholderId: placeholder.id,
      forceHallucinationDemo: extras?.forceHallucinationDemo,
    });
  }

  async function askAcharya(args: {
    question: string;
    language: Language;
    placeholderId: string;
    forceHallucinationDemo?: boolean;
  }) {
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: args.question,
          language: args.language,
          consensus: true,
          forceHallucinationDemo: args.forceHallucinationDemo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === args.placeholderId
            ? {
                ...m,
                content: data.answer,
                pending: false,
                verdict: data.verdict ?? "Verified",
                reasoning: data.reasoning ?? undefined,
              }
            : m,
        ),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === args.placeholderId
            ? {
                ...m,
                content: `⚠️ Acharya could not reach the model.\n\n\`${msg}\`\n\nMake sure \`.env.local\` has \`ANTHROPIC_API_KEY\` set, then restart the dev server.`,
                pending: false,
                verdict: "Needs human review",
              }
            : m,
        ),
      );
    }
  }

  function clearChat() {
    if (confirm("Clear the entire conversation?")) setMessages([]);
  }

  async function handlePickScenario(id: string) {
    const sc = SCENARIOS.find((s) => s.id === id);
    if (!sc) return;
    setLanguage(sc.language);

    if (sc.imageUrl) {
      // Image scenario — rasterize the SVG to PNG, run extraction, then send.
      try {
        // Try the SVG first (we ship it as .svg); fall back to the requested .png path.
        const tryUrls = [
          sc.imageUrl.replace(/\.png$/i, ".svg"),
          sc.imageUrl,
        ];
        let pngDataUrl: string | null = null;
        for (const u of tryUrls) {
          try {
            pngDataUrl = await svgUrlToPngDataUrl(u);
            break;
          } catch {
            /* try next */
          }
        }
        if (!pngDataUrl) throw new Error("Could not load demo image");

        // Extract question via the same vision pipeline.
        const res = await fetch("/api/extract-question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageDataUrl: pngDataUrl }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

        // Auto-send: post the user message + placeholder, then run consensus.
        const text = data.question || "";
        const userMsg: ChatMessage = {
          id: uid(),
          role: "user",
          content: text,
          imageDataUrl: pngDataUrl,
          language: sc.language,
          createdAt: Date.now(),
        };
        const placeholder: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: "",
          createdAt: Date.now() + 1,
          pending: true,
          verdict: "Pending",
        };
        setMessages((prev) => [...prev, userMsg, placeholder]);
        void askAcharya({
          question: text,
          language: sc.language,
          placeholderId: placeholder.id,
          forceHallucinationDemo: sc.forceHallucinationDemo,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        alert(`Demo scenario failed: ${msg}`);
      }
      return;
    }

    // Text-only scenario — auto-send immediately so the audience sees the
    // typing dots and verdict appear in real time.
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: sc.question,
      language: sc.language,
      createdAt: Date.now(),
    };
    const placeholder: ChatMessage = {
      id: uid(),
      role: "assistant",
      content: "",
      createdAt: Date.now() + 1,
      pending: true,
      verdict: "Pending",
    };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    void askAcharya({
      question: sc.question,
      language: sc.language,
      placeholderId: placeholder.id,
      forceHallucinationDemo: sc.forceHallucinationDemo,
    });
  }

  async function handlePickImage(file: File): Promise<string | null> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });

    try {
      const res = await fetch("/api/extract-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.no_question_found) {
        setDraft({
          text: "",
          imageDataUrl: dataUrl,
        });
        alert(
          "Couldn't find a clear question on the page. You can type your question and send the image as context.",
        );
      } else {
        setDraft({
          text: data.question || "",
          imageDataUrl: dataUrl,
        });
      }
      return dataUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`Could not read the image: ${msg}`);
      // Still attach the image so the user can type the question manually.
      setDraft({ text: "", imageDataUrl: dataUrl });
      return dataUrl;
    }
  }

  return (
    <div className="h-screen w-screen flex justify-center bg-neutral-200">
      <div className="w-full max-w-[480px] h-full flex flex-col bg-whatsapp-chatBg shadow-xl">
        <ChatHeader
          showConsensus={showConsensus}
          onToggleConsensus={setShowConsensus}
          onClearChat={clearChat}
          scenarios={SCENARIOS.map((s) => ({ id: s.id, label: s.label }))}
          onPickScenario={handlePickScenario}
        />
        <MessageList messages={messages} showConsensus={showConsensus} />
        <MessageInput
          language={language}
          onLanguageChange={setLanguage}
          onSend={handleSend}
          draft={draft}
          onConsumeDraft={() => setDraft(null)}
          onPickImage={handlePickImage}
        />
      </div>
    </div>
  );
}
