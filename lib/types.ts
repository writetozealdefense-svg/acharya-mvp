// Shared types — populated incrementally from Phase 2 onward.

export type Language = "kn" | "hi" | "en";

export const LANGUAGE_LABELS: Record<Language, string> = {
  kn: "ಕನ್ನಡ",
  hi: "हिंदी",
  en: "EN",
};

export const LANGUAGE_NAMES: Record<Language, string> = {
  kn: "Kannada",
  hi: "Hindi",
  en: "English",
};

export type Subject =
  | "physics"
  | "chemistry"
  | "biology"
  | "math"
  | "history"
  | "geography"
  | "language"
  | "other";

export type Verdict =
  | "Verified"
  | "Likely correct"
  | "Needs human review"
  | "Pending";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageDataUrl?: string;
  language?: Language;
  verdict?: Verdict;
  reasoning?: ConsensusReasoning;
  createdAt: number;
  pending?: boolean;
}

export interface ModelResponse {
  name: string;
  model_id: string;
  answer: string;
  key_facts: string[];
  confidence: number;
  subject: Subject;
  ok: boolean;
  error?: string;
  latency_ms?: number;
}

export interface FactScore {
  model: string;
  fact: string;
  score: 0 | 1 | 2;
}

export interface ConsensusReasoning {
  models: ModelResponse[];
  fact_scores: FactScore[];
  subject_consensus: { subject: Subject | null; agreeing_models: number };
  chosen_model: string;
  chosen_reason: string;
}

export interface AskResponse {
  verdict: Verdict;
  answer: string;
  latency_ms: number;
  reasoning: ConsensusReasoning;
}
