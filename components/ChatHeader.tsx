"use client";

import { ChevronLeft, MoreVertical, Phone, Video } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface ChatHeaderProps {
  showConsensus: boolean;
  onToggleConsensus: (next: boolean) => void;
  scenarios?: { id: string; label: string }[];
  onPickScenario?: (id: string) => void;
  onClearChat?: () => void;
}

export default function ChatHeader({
  showConsensus,
  onToggleConsensus,
  scenarios = [],
  onPickScenario,
  onClearChat,
}: ChatHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);

  return (
    <header className="bg-whatsapp-header text-white relative z-20">
      <div className="flex items-center px-3 py-2 gap-3">
        <button className="p-1 hover:bg-whatsapp-headerDark rounded" aria-label="Back">
          <ChevronLeft size={22} />
        </button>

        <div className="w-10 h-10 rounded-full bg-acharya-gold flex items-center justify-center text-white font-semibold shadow-sm shrink-0">
          A
        </div>

        <div className="flex-1 min-w-0 leading-tight">
          <div className="font-semibold text-[16px] truncate">Acharya</div>
          <div className="text-[12px] text-white/80 truncate">
            Online · Verified by 3 models
          </div>
        </div>

        <button className="p-2 hover:bg-whatsapp-headerDark rounded" aria-label="Video call">
          <Video size={20} />
        </button>
        <button className="p-2 hover:bg-whatsapp-headerDark rounded" aria-label="Voice call">
          <Phone size={20} />
        </button>
        <div className="relative">
          <button
            className="p-2 hover:bg-whatsapp-headerDark rounded"
            aria-label="Menu"
            onClick={() => {
              setMenuOpen((v) => !v);
              setScenarioOpen(false);
            }}
          >
            <MoreVertical size={20} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-60 bg-white text-whatsapp-textPrimary rounded shadow-lg border border-black/5 overflow-hidden">
              <Link
                href="/dashboard"
                className="block px-4 py-2.5 text-sm hover:bg-neutral-100 border-b border-neutral-100"
                onClick={() => setMenuOpen(false)}
              >
                Parent dashboard
              </Link>
              {scenarios.length > 0 && (
                <button
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-100 border-b border-neutral-100 flex items-center justify-between"
                  onClick={() => setScenarioOpen((v) => !v)}
                >
                  <span>Demo scenarios</span>
                  <span className="text-whatsapp-textSecondary text-xs">
                    {scenarioOpen ? "▾" : "▸"}
                  </span>
                </button>
              )}
              {scenarioOpen &&
                scenarios.map((s) => (
                  <button
                    key={s.id}
                    className="w-full text-left px-6 py-2 text-sm hover:bg-neutral-100 border-b border-neutral-100 last:border-b-0"
                    onClick={() => {
                      onPickScenario?.(s.id);
                      setMenuOpen(false);
                      setScenarioOpen(false);
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              {onClearChat && (
                <button
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-100 text-red-600"
                  onClick={() => {
                    onClearChat();
                    setMenuOpen(false);
                  }}
                >
                  Clear chat
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-whatsapp-headerDark px-3 py-1.5 flex items-center justify-between text-[12px]">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="accent-acharya-gold w-3.5 h-3.5"
            checked={showConsensus}
            onChange={(e) => onToggleConsensus(e.target.checked)}
          />
          <span>Show consensus reasoning</span>
        </label>
        <span className="text-white/70">Brooks–Iyengar · 3 models</span>
      </div>
    </header>
  );
}
