// Curriculum-grounded retrieval — simple keyword overlap, no embeddings.
//
// Detect language from script (Devanagari → hi, Kannada → kn, else en).
// Tokenise both the question and each excerpt, drop stop words, and score
// each excerpt by the number of overlapping content words. Return the top-2
// non-zero matches. Subject-restricted excerpts of the wrong language can
// still match because the English translation is also tokenised when present.

import excerptsJson from "@/data/textbook-excerpts.json";
import type { Language } from "./types";

interface RawExcerpt {
  id: string;
  subject: string;
  class: number;
  board: string;
  language: Language;
  topic: string;
  excerpt: string;
  english_translation: string | null;
}

const EXCERPTS = excerptsJson as RawExcerpt[];

// Tiny multilingual stop-word lists. Not exhaustive — just enough to suppress
// the highest-frequency noise words for each language.
const STOPWORDS_EN = new Set([
  "a","an","the","is","are","was","were","be","been","being","of","in","on","to",
  "for","and","or","but","if","then","that","this","these","those","it","its","at",
  "as","by","from","with","about","into","over","under","between","through","what",
  "when","where","why","how","who","whom","which","do","does","did","will","would",
  "can","could","should","i","we","you","they","he","she","them","us","my","your",
  "their","our","not","no","yes","than","also","very","just","there","here","one",
  "two","three"
]);
const STOPWORDS_HI = new Set([
  "का","की","के","को","में","है","हैं","था","थी","थे","और","या","पर","से","कि",
  "तो","ही","भी","यह","वह","वे","कौन","क्या","कैसे","कहाँ","क्यों","जब","जो",
  "एक","दो","तीन"
]);
const STOPWORDS_KN = new Set([
  "ಒಂದು","ಎರಡು","ಮೂರು","ಮತ್ತು","ಅಥವಾ","ಆದರೆ","ಅದು","ಇದು","ಅವು","ಇವು","ಎಂದು",
  "ಎಂಬ","ಆ","ಈ","ಯಾವ","ಯಾರು","ಏನು","ಎಲ್ಲಿ","ಯಾಕೆ","ಹೇಗೆ","ಇದೆ","ಆಗಿದೆ"
]);

export function detectLanguage(text: string): Language {
  if (/[ऀ-ॿ]/.test(text)) return "hi";  // Devanagari
  if (/[ಀ-೿]/.test(text)) return "kn";  // Kannada
  return "en";
}

function isStop(word: string, lang: Language): boolean {
  const w = word.toLowerCase();
  if (lang === "en") return STOPWORDS_EN.has(w) || w.length < 3;
  if (lang === "hi") return STOPWORDS_HI.has(w) || w.length < 2;
  return STOPWORDS_KN.has(w) || w.length < 2;
}

function tokens(text: string, lang: Language): string[] {
  // Word characters across Latin + Devanagari + Kannada + digits.
  const matches = text
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) ?? [];
  return matches.filter((w) => !isStop(w, lang));
}

export interface RetrievedExcerpt {
  id: string;
  subject: string;
  topic: string;
  class: number;
  board: string;
  excerpt: string;
  english_translation: string | null;
  score: number;
}

export function retrieveExcerpts(
  question: string,
  lang?: Language,
  limit = 2,
): RetrievedExcerpt[] {
  const language = lang ?? detectLanguage(question);
  const qTokens = new Set(tokens(question, language));
  if (qTokens.size === 0) return [];

  const scored: RetrievedExcerpt[] = [];

  for (const ex of EXCERPTS) {
    // Tokenise both the original and (if present) the English translation,
    // each in its own language so cross-language matches still work.
    const exTokens = new Set([
      ...tokens(ex.excerpt, ex.language),
      ...tokens(ex.topic, ex.language),
    ]);
    if (ex.english_translation) {
      for (const t of tokens(ex.english_translation, "en")) exTokens.add(t);
    }

    let overlap = 0;
    for (const t of qTokens) {
      if (exTokens.has(t)) overlap++;
      // Cross-language: also check Latin-translated tokens against the question's
      // tokens when the question is in English but the excerpt is vernacular.
      if (language === "en" && ex.english_translation) {
        const enTokens = new Set(tokens(ex.english_translation, "en"));
        if (enTokens.has(t)) overlap++;
      }
    }

    // Small boost when topic words appear directly in the question (very strong signal).
    const topicHit = tokens(ex.topic, ex.language).some((t) => qTokens.has(t)) ||
      (ex.english_translation
        ? tokens(ex.english_translation, "en").some((t) => qTokens.has(t))
        : false);
    if (topicHit) overlap += 1;

    if (overlap > 0) {
      scored.push({
        id: ex.id,
        subject: ex.subject,
        topic: ex.topic,
        class: ex.class,
        board: ex.board,
        excerpt: ex.excerpt,
        english_translation: ex.english_translation,
        score: overlap,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
