"use client";

import { LANGUAGE_LABELS, type Language } from "@/lib/types";

interface LanguageToggleProps {
  value: Language;
  onChange: (lang: Language) => void;
}

const ORDER: Language[] = ["kn", "hi", "en"];

export default function LanguageToggle({ value, onChange }: LanguageToggleProps) {
  return (
    <div className="inline-flex items-center bg-white/90 rounded-full shadow-sm border border-black/5 p-0.5 text-[12px]">
      {ORDER.map((lang) => {
        const active = lang === value;
        return (
          <button
            key={lang}
            onClick={() => onChange(lang)}
            className={`px-3 py-1 rounded-full transition-colors ${
              active
                ? "bg-whatsapp-header text-white"
                : "text-whatsapp-textSecondary hover:text-whatsapp-textPrimary"
            }`}
            aria-pressed={active}
          >
            {LANGUAGE_LABELS[lang]}
          </button>
        );
      })}
    </div>
  );
}
