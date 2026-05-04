// Three model adapters with a unified interface.
// Phase 3: Claude only, plain-text answer.
// Phase 5: All three with structured JSON for consensus.

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

import {
  CONSENSUS_TUTOR_SYSTEM_PROMPT,
  TUTOR_SYSTEM_PROMPT,
  buildUserPrompt,
} from "./prompts";
import type { Language, ModelResponse, Subject } from "./types";

export const CLAUDE_MODEL = "claude-sonnet-4-5";
export const OPENAI_MODEL = "gpt-4o-mini";
export const GEMINI_MODEL = "gemini-2.0-flash-exp";

const TIMEOUT_MS = 15_000;

function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS, label = "model"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function safeJsonParse<T>(s: string): T | null {
  if (!s) return null;
  let text = s.trim();
  // Strip code fences if a model adds them.
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) text = fence[1].trim();
  // Find the first { ... } if there's stray prose.
  if (!text.startsWith("{")) {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) text = m[0];
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

interface StructuredAnswer {
  answer: string;
  key_facts: string[];
  confidence: number;
  subject: Subject;
}

function normalizeStructured(raw: unknown, fallbackAnswer = ""): StructuredAnswer {
  const r = (raw ?? {}) as Partial<StructuredAnswer> & Record<string, unknown>;
  const subjectAllowed: Subject[] = [
    "physics",
    "chemistry",
    "biology",
    "math",
    "history",
    "geography",
    "language",
    "other",
  ];
  const subj = (typeof r.subject === "string" ? r.subject.toLowerCase() : "other") as Subject;
  return {
    answer: typeof r.answer === "string" && r.answer.trim() ? r.answer : fallbackAnswer,
    key_facts: Array.isArray(r.key_facts)
      ? r.key_facts.filter((f): f is string => typeof f === "string" && f.trim().length > 0).slice(0, 8)
      : [],
    confidence: clamp01(typeof r.confidence === "number" ? r.confidence : 0.5),
    subject: subjectAllowed.includes(subj) ? subj : "other",
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

// ---------------- Claude ----------------

let _anthropic: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

export async function askClaudePlain(
  question: string,
  language: Language,
): Promise<string> {
  const userPrompt = buildUserPrompt({ question, language });
  const resp = await withTimeout(
    anthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: TUTOR_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
    TIMEOUT_MS,
    "Claude",
  );
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return text || "(no response)";
}

export async function askClaudeStructured(
  question: string,
  language: Language,
  curriculumExcerpts?: Parameters<typeof buildUserPrompt>[0]["curriculumExcerpts"],
): Promise<ModelResponse> {
  const t0 = Date.now();
  try {
    const userPrompt = buildUserPrompt({ question, language, curriculumExcerpts });
    const resp = await withTimeout(
      anthropic().messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: CONSENSUS_TUTOR_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
      TIMEOUT_MS,
      "Claude",
    );
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    const parsed = safeJsonParse<StructuredAnswer>(text);
    const norm = normalizeStructured(parsed ?? { answer: text }, text);
    return {
      name: "Claude Sonnet",
      model_id: CLAUDE_MODEL,
      ok: true,
      latency_ms: Date.now() - t0,
      ...norm,
    };
  } catch (e: unknown) {
    return {
      name: "Claude Sonnet",
      model_id: CLAUDE_MODEL,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      answer: "",
      key_facts: [],
      confidence: 0,
      subject: "other",
      latency_ms: Date.now() - t0,
    };
  }
}

// ---------------- OpenAI ----------------

let _openai: OpenAI | null = null;
function openai(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export async function askOpenAIStructured(
  question: string,
  language: Language,
  curriculumExcerpts?: Parameters<typeof buildUserPrompt>[0]["curriculumExcerpts"],
): Promise<ModelResponse> {
  const t0 = Date.now();
  try {
    const userPrompt = buildUserPrompt({ question, language, curriculumExcerpts });
    const resp = await withTimeout(
      openai().chat.completions.create({
        model: OPENAI_MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CONSENSUS_TUTOR_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
      TIMEOUT_MS,
      "OpenAI",
    );
    const text = resp.choices[0]?.message?.content?.trim() ?? "";
    const parsed = safeJsonParse<StructuredAnswer>(text);
    const norm = normalizeStructured(parsed ?? { answer: text }, text);
    return {
      name: "GPT-4o mini",
      model_id: OPENAI_MODEL,
      ok: true,
      latency_ms: Date.now() - t0,
      ...norm,
    };
  } catch (e: unknown) {
    return {
      name: "GPT-4o mini",
      model_id: OPENAI_MODEL,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      answer: "",
      key_facts: [],
      confidence: 0,
      subject: "other",
      latency_ms: Date.now() - t0,
    };
  }
}

// ---------------- Gemini ----------------

let _gemini: GoogleGenerativeAI | null = null;
function gemini(): GoogleGenerativeAI {
  if (!_gemini) {
    if (!process.env.GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY not set");
    _gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }
  return _gemini;
}

export async function askGeminiStructured(
  question: string,
  language: Language,
  curriculumExcerpts?: Parameters<typeof buildUserPrompt>[0]["curriculumExcerpts"],
): Promise<ModelResponse> {
  const t0 = Date.now();
  try {
    const userPrompt = buildUserPrompt({ question, language, curriculumExcerpts });
    const model = gemini().getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: CONSENSUS_TUTOR_SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    const result = await withTimeout(
      model.generateContent(userPrompt),
      TIMEOUT_MS,
      "Gemini",
    );
    const text = result.response.text().trim();
    const parsed = safeJsonParse<StructuredAnswer>(text);
    const norm = normalizeStructured(parsed ?? { answer: text }, text);
    return {
      name: "Gemini 2.0 Flash",
      model_id: GEMINI_MODEL,
      ok: true,
      latency_ms: Date.now() - t0,
      ...norm,
    };
  } catch (e: unknown) {
    return {
      name: "Gemini 2.0 Flash",
      model_id: GEMINI_MODEL,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      answer: "",
      key_facts: [],
      confidence: 0,
      subject: "other",
      latency_ms: Date.now() - t0,
    };
  }
}

// ---------------- Vision (Phase 4) ----------------

export async function extractQuestionFromImage(
  imageBase64: string,
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif",
  prompt: string,
): Promise<string> {
  const resp = await withTimeout(
    anthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
    TIMEOUT_MS,
    "Claude vision",
  );
  return resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// ---------------- Judge (Phase 5) ----------------

export async function judgeFactAgreement(
  factA: string,
  modelBFacts: string[],
  modelCFacts: string[],
  judgeSystemPrompt: string,
): Promise<{ b_agrees: boolean; c_agrees: boolean; reason: string }> {
  const userPrompt = `Model A claim: "${factA}"

Model B's full list of claims:
${modelBFacts.map((f, i) => `${i + 1}. ${f}`).join("\n") || "(no claims)"}

Model C's full list of claims:
${modelCFacts.map((f, i) => `${i + 1}. ${f}`).join("\n") || "(no claims)"}

Does Model B make any claim that AGREES with Model A's claim?
Does Model C make any claim that AGREES with Model A's claim?
Respond with JSON only.`;

  try {
    const resp = await withTimeout(
      anthropic().messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 256,
        system: judgeSystemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      TIMEOUT_MS,
      "Judge",
    );
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    const parsed = safeJsonParse<{ b_agrees: boolean; c_agrees: boolean; reason: string }>(
      text,
    );
    if (!parsed) return { b_agrees: false, c_agrees: false, reason: "unparseable" };
    return {
      b_agrees: !!parsed.b_agrees,
      c_agrees: !!parsed.c_agrees,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    };
  } catch (e: unknown) {
    return {
      b_agrees: false,
      c_agrees: false,
      reason: `judge error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
