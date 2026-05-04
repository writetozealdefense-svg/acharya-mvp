// Brooks–Iyengar fault-tolerant consensus across three independent LLMs.
//
// The four steps run in this order:
//   A. Subject agreement      — majority subject across the three models
//   B. Fact overlap scoring   — a fourth Claude call judges each fact 0/1/2
//   C. Fault-tolerant fusion  — discard outliers; choose answer from highest-confidence
//                               model whose facts are consistent with the surviving set
//   D. Verdict assignment     — Verified / Likely correct / Needs human review

import {
  askClaudeStructured,
  askGeminiStructured,
  askOpenAIStructured,
  judgeFactAgreement,
} from "./models";
import { JUDGE_SYSTEM_PROMPT } from "./prompts";
import type {
  AskResponse,
  ConsensusReasoning,
  FactScore,
  Language,
  ModelResponse,
  Subject,
  Verdict,
} from "./types";

export interface RunConsensusOpts {
  question: string;
  language: Language;
  forceHallucinationDemo?: boolean;
  curriculumExcerpts?: Parameters<
    typeof import("./prompts").buildUserPrompt
  >[0]["curriculumExcerpts"];
}

const HALLUCINATION_INJECTION: ModelResponse = {
  name: "GPT-4o mini",
  model_id: "gpt-4o-mini",
  ok: true,
  answer:
    "Aryabhata invented the number zero in the 5th century. He was the first mathematician to use zero as a number in his work *Aryabhatiya*, and the modern symbol for zero is directly attributed to him.",
  key_facts: [
    "Aryabhata invented the number zero.",
    "Aryabhata used zero as a number in the Aryabhatiya.",
    "The modern symbol for zero is attributed to Aryabhata.",
  ],
  confidence: 0.9,
  subject: "history",
  latency_ms: 820,
};

export async function runConsensus(opts: RunConsensusOpts): Promise<AskResponse> {
  const { question, language, curriculumExcerpts } = opts;

  // Step 0 — call all three models in parallel.
  const [claude, openaiResp, geminiResp] = await Promise.all([
    askClaudeStructured(question, language, curriculumExcerpts),
    opts.forceHallucinationDemo
      ? Promise.resolve(HALLUCINATION_INJECTION)
      : askOpenAIStructured(question, language, curriculumExcerpts),
    askGeminiStructured(question, language, curriculumExcerpts),
  ]);

  const models: ModelResponse[] = [claude, openaiResp, geminiResp];
  const okModels = models.filter((m) => m.ok && m.key_facts.length > 0);

  // If fewer than 2 models returned usable structured output, we cannot run consensus.
  if (okModels.length < 2) {
    const fallback =
      models.find((m) => m.ok && m.answer) ?? models.find((m) => m.ok);
    return {
      verdict: "Needs human review",
      answer:
        fallback?.answer ||
        "Acharya could not get enough models to respond. Please try again.",
      latency_ms: 0,
      reasoning: {
        models,
        fact_scores: [],
        subject_consensus: { subject: null, agreeing_models: 0 },
        chosen_model: fallback?.name ?? "(none)",
        chosen_reason: `Only ${okModels.length}/3 models returned usable structured output, so Brooks–Iyengar fusion could not run.`,
      },
    };
  }

  // ───────────── Step A: subject agreement ─────────────
  const subjectCounts = new Map<Subject, number>();
  for (const m of okModels) {
    subjectCounts.set(m.subject, (subjectCounts.get(m.subject) ?? 0) + 1);
  }
  let topSubject: Subject | null = null;
  let topSubjectCount = 0;
  for (const [subj, count] of subjectCounts) {
    if (count > topSubjectCount) {
      topSubject = subj;
      topSubjectCount = count;
    }
  }
  const subjectMajority = topSubjectCount >= 2;

  // ───────────── Step B: fact overlap scoring ─────────────
  // For each model M, for each of M's facts, ask the judge whether each of the
  // other two models has any agreeing claim. Score = number of "yes"es (0..2).
  const fact_scores: FactScore[] = [];
  const judgeJobs: Promise<void>[] = [];

  for (const m of okModels) {
    const others = okModels.filter((x) => x.name !== m.name);
    // Brooks–Iyengar requires comparing against the other two; if a model failed,
    // pad with empty so structure is preserved.
    const otherA = others[0] ?? { name: "", key_facts: [] as string[] };
    const otherB = others[1] ?? { name: "", key_facts: [] as string[] };

    for (const fact of m.key_facts) {
      const job = (async () => {
        const verdict = await judgeFactAgreement(
          fact,
          otherA.key_facts,
          otherB.key_facts,
          JUDGE_SYSTEM_PROMPT,
        );
        const score = ((verdict.b_agrees ? 1 : 0) +
          (verdict.c_agrees ? 1 : 0)) as 0 | 1 | 2;
        fact_scores.push({ model: m.name, fact, score });
      })();
      judgeJobs.push(job);
    }
  }
  await Promise.all(judgeJobs);

  // ───────────── Step C: fault-tolerant fusion ─────────────
  // For each model, compute the fraction of its facts that have score >= 1
  // (i.e. at least one other model agrees). Drop facts with score 0 (outliers).
  // Choose the answer from the highest-confidence model whose surviving fact
  // set is non-empty AND its facts mostly agree with the others (avg score >= 1).
  const perModelStats = new Map<
    string,
    { totalFacts: number; agreedFacts: number; survivingFacts: string[]; avgScore: number }
  >();

  for (const m of okModels) {
    const myScores = fact_scores.filter((fs) => fs.model === m.name);
    const surviving = myScores.filter((fs) => fs.score >= 1).map((fs) => fs.fact);
    const total = myScores.length || 1;
    const agreed = myScores.filter((fs) => fs.score >= 1).length;
    const avg = myScores.reduce((s, fs) => s + fs.score, 0) / total;
    perModelStats.set(m.name, {
      totalFacts: myScores.length,
      agreedFacts: agreed,
      survivingFacts: surviving,
      avgScore: avg,
    });
  }

  // Eligible = subject-majority match + at least one surviving fact + avg >= 1
  const eligible = okModels
    .filter((m) => {
      const stats = perModelStats.get(m.name)!;
      const subjectOk = !subjectMajority || m.subject === topSubject;
      return subjectOk && stats.survivingFacts.length > 0 && stats.avgScore >= 1;
    })
    .sort((a, b) => b.confidence - a.confidence);

  let chosen: ModelResponse;
  let chosenReason: string;
  if (eligible.length > 0) {
    chosen = eligible[0];
    const s = perModelStats.get(chosen.name)!;
    chosenReason = `${chosen.name} has the highest confidence (${(chosen.confidence * 100).toFixed(0)}%) among models whose claims survived fault-tolerant fusion. ${s.agreedFacts}/${s.totalFacts} of its facts had agreement (≥1) and its average agreement score was ${s.avgScore.toFixed(2)}/2.`;
  } else {
    // Nothing survived — fall back to whichever model has the highest confidence
    // among the okModels, but flag it.
    chosen = [...okModels].sort((a, b) => b.confidence - a.confidence)[0];
    chosenReason = `No model's facts survived fault-tolerant fusion cleanly. Falling back to the highest-confidence model (${chosen.name}) and flagging the answer for review.`;
  }

  // ───────────── Step D: verdict assignment ─────────────
  const totalFacts = fact_scores.length || 1;
  const agreeFraction =
    fact_scores.filter((fs) => fs.score >= 1).length / totalFacts;
  const allThreeOk = okModels.length === 3;
  const subjectAllAgree = topSubjectCount === 3 && allThreeOk;
  const subjectMajorityAgree = topSubjectCount >= 2;

  let verdict: Verdict;
  if (subjectAllAgree && agreeFraction >= 0.8 && eligible.length > 0) {
    verdict = "Verified";
  } else if (subjectMajorityAgree && agreeFraction >= 0.6 && eligible.length > 0) {
    verdict = "Likely correct";
  } else {
    verdict = "Needs human review";
  }

  const reasoning: ConsensusReasoning = {
    models,
    fact_scores,
    subject_consensus: {
      subject: subjectMajority ? topSubject : null,
      agreeing_models: topSubjectCount,
    },
    chosen_model: chosen.name,
    chosen_reason: chosenReason,
  };

  return {
    verdict,
    answer: chosen.answer || "(no answer)",
    latency_ms: 0,
    reasoning,
  };
}
