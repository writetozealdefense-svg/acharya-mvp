"use client";

import type { ConsensusReasoning, FactScore, Verdict } from "@/lib/types";

interface ConsensusPanelProps {
  reasoning: ConsensusReasoning;
  verdict?: Verdict;
}

function scoreClasses(score: 0 | 1 | 2): string {
  if (score === 2) return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (score === 1) return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-red-100 text-red-700 border-red-300";
}

function scoreLabel(score: 0 | 1 | 2): string {
  if (score === 2) return "2 / 2 agree";
  if (score === 1) return "1 / 2 agree";
  return "0 / 2 agree";
}

export default function ConsensusPanel({ reasoning, verdict }: ConsensusPanelProps) {
  const { models, fact_scores, subject_consensus, chosen_model, chosen_reason } =
    reasoning;

  // Group fact scores by model
  const scoresByModel = new Map<string, FactScore[]>();
  for (const fs of fact_scores) {
    if (!scoresByModel.has(fs.model)) scoresByModel.set(fs.model, []);
    scoresByModel.get(fs.model)!.push(fs);
  }

  return (
    <div className="w-full max-w-[640px] bg-white rounded-lg border border-black/10 shadow-sm text-[12px] text-whatsapp-textPrimary overflow-hidden mt-1">
      <div className="px-3 py-2 bg-neutral-50 border-b border-black/5 flex items-center justify-between">
        <div>
          <span className="font-semibold">Brooks–Iyengar consensus</span>
          <span className="text-whatsapp-textSecondary ml-2">
            · 3 independent models
          </span>
        </div>
        <span className="text-[11px] text-whatsapp-textSecondary">
          Chosen: <span className="font-medium">{chosen_model}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-black/5">
        {models.map((m) => {
          const isChosen = m.name === chosen_model;
          return (
            <div
              key={m.name}
              className={`p-3 ${isChosen ? "bg-emerald-50/50" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-[12px] flex items-center gap-1.5">
                  {m.name}
                  {isChosen && (
                    <span className="text-[9px] uppercase tracking-wide bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                      Chosen
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-whatsapp-textSecondary">
                  {m.ok ? `${(m.confidence * 100).toFixed(0)}%` : "fail"}
                </div>
              </div>
              <div className="text-[10px] text-whatsapp-textSecondary mb-1.5">
                {m.model_id} · subject:{" "}
                <span className="font-medium">{m.subject}</span>
                {typeof m.latency_ms === "number" && (
                  <> · {m.latency_ms} ms</>
                )}
              </div>

              {!m.ok ? (
                <div className="text-[11px] text-red-600">
                  Model failed: {m.error || "unknown error"}
                </div>
              ) : (
                <>
                  <div className="text-[12px] leading-snug mb-2 max-h-32 overflow-y-auto pr-1 chat-scroll">
                    {m.answer}
                  </div>
                  <div className="space-y-1">
                    {m.key_facts.map((fact, i) => {
                      const score =
                        scoresByModel.get(m.name)?.find((fs) => fs.fact === fact)
                          ?.score ?? 0;
                      return (
                        <div
                          key={i}
                          className={`text-[11px] border rounded px-1.5 py-1 leading-snug ${scoreClasses(score)}`}
                          title={scoreLabel(score)}
                        >
                          <div className="flex items-start gap-1.5">
                            <span className="font-mono font-semibold shrink-0">
                              {score}/2
                            </span>
                            <span>{fact}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 bg-neutral-50 border-t border-black/5 text-[11px] leading-snug">
        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
          <div>
            <span className="text-whatsapp-textSecondary">Subject agreement:</span>{" "}
            <span className="font-medium">
              {subject_consensus.subject ?? "no agreement"} ·{" "}
              {subject_consensus.agreeing_models}/3
            </span>
          </div>
          <div>
            <span className="text-whatsapp-textSecondary">Verdict:</span>{" "}
            <span className="font-medium">{verdict ?? "Pending"}</span>
          </div>
        </div>
        <div className="mt-1 text-whatsapp-textSecondary">{chosen_reason}</div>
        <div className="mt-1 flex items-center gap-3 text-[10px] text-whatsapp-textSecondary">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" /> 2/2
            agree
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" /> 1/2
            agree
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-red-400 inline-block" /> outlier
          </span>
        </div>
      </div>
    </div>
  );
}
