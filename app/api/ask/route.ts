import { NextResponse } from "next/server";
import { askClaudePlain } from "@/lib/models";
import { retrieveExcerpts } from "@/lib/retrieval";
import type { Language } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface AskRequestBody {
  question: string;
  language: Language;
  // Phase 5 additions:
  consensus?: boolean;
  forceHallucinationDemo?: boolean;
}

export async function POST(req: Request) {
  let body: AskRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question = (body.question ?? "").trim();
  const language: Language = body.language ?? "en";
  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  // Curriculum retrieval — runs locally, no LLM call. Top-2 excerpts are
  // injected into every model's prompt (consensus path) or Claude's prompt
  // (single-model path).
  const retrieved = retrieveExcerpts(question, language, 2);
  const curriculumExcerpts = retrieved.map((r) => ({
    topic: r.topic,
    excerpt: r.excerpt,
    english_translation: r.english_translation,
    subject: r.subject,
  }));

  if (body.consensus) {
    const { runConsensus } = await import("@/lib/consensus");
    const t0 = Date.now();
    const result = await runConsensus({
      question,
      language,
      curriculumExcerpts,
      forceHallucinationDemo: !!body.forceHallucinationDemo,
    });
    return NextResponse.json({
      ...result,
      latency_ms: Date.now() - t0,
      retrieved: retrieved.map((r) => ({ id: r.id, topic: r.topic, score: r.score })),
    });
  }

  // Phase 3 path: single-model Claude.
  const t0 = Date.now();
  try {
    const answer = await askClaudePlain(question, language);
    return NextResponse.json({
      verdict: "Verified",
      answer,
      latency_ms: Date.now() - t0,
      reasoning: null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: msg, latency_ms: Date.now() - t0 },
      { status: 500 },
    );
  }
}
