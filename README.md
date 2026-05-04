# Acharya — MVP demo

**Vernacular AI tutor for Indian school children (Class 6–10), with Brooks–Iyengar fault-tolerant consensus across three independent LLMs.**

This repository is a local Next.js demo that simulates the WhatsApp experience in the browser while running the real product intelligence — vernacular Q&A, multi-model consensus, Claude-vision image-to-question ingestion, and curriculum-grounded retrieval — against live LLM APIs.

The single most important moment in this demo is watching the Brooks–Iyengar engine catch a hallucinated answer in real time, with all three model votes visible side-by-side.

---

## Quick start

```bash
npm install
cp .env.local.example .env.local        # then fill in your three API keys
npm run dev
```

Open <http://localhost:3000>.

You need API keys for all three providers:

| Variable             | Where to get it                          |
| -------------------- | ---------------------------------------- |
| `ANTHROPIC_API_KEY`  | <https://console.anthropic.com>          |
| `OPENAI_API_KEY`     | <https://platform.openai.com/api-keys>   |
| `GOOGLE_API_KEY`     | <https://aistudio.google.com/app/apikey> |

If a key is missing, that model degrades to a "fail" card in the consensus panel and the engine carries on with the surviving two.

---

## Demo script (5 bullets)

1. **Open the chat** at <http://localhost:3000> — you should see what looks like a WhatsApp conversation with "Acharya" and the subtitle *"Online · Verified by 3 models"*.
2. **Ask a Kannada question** by typing or by opening the menu (⋮) → *Demo scenarios* → *Class 7 · Kannada · Oxygen vs CO₂*. Watch the typing dots and the green ✓ Verified badge appear.
3. **Toggle "Show consensus reasoning"** in the dark header strip. Three columns appear under the answer — Claude Sonnet, GPT-4o-mini, Gemini 2.0 Flash — each with its own answer, confidence, latency, and a stack of color-coded fact pills (green = both other models agree, amber = one agrees, red = outlier).
4. **Upload the algebra image:** menu → *Demo scenarios* → *Class 8 · Hindi · Algebra image upload*. Claude Sonnet's vision capability extracts "2x + 3 = 11" from a Hindi worksheet page; the consensus engine solves it step-by-step.
5. **Run the hallucination scenario:** menu → *The hallucination catch — who invented zero?* One model is hard-coded (clearly labelled in `lib/consensus.ts`) to confidently claim Aryabhata invented zero. Watch the engine flag the disagreement, downgrade the verdict, and choose the answer from the models that survived fault-tolerant fusion.

> **Running this for Dr. Iyengar or an investor?** See **[DEMOS.md](DEMOS.md)** for full presenter walkthroughs — narration cues, what to point at, and what to do if any scenario doesn't behave as described.

---

## What's real and what's simulated

**Real (production-equivalent):**
- The Brooks–Iyengar consensus algorithm in [`lib/consensus.ts`](lib/consensus.ts) — runs all three LLMs in parallel, scores fact agreement via a fourth Claude judge call, applies fault-tolerant fusion, and assigns a verdict per the published thresholds.
- All three model adapters in [`lib/models.ts`](lib/models.ts) — real `@anthropic-ai/sdk`, `openai`, and `@google/generative-ai` calls with structured JSON output, 15-second timeouts, and graceful failure.
- Claude Sonnet vision-based question extraction in [`app/api/extract-question/route.ts`](app/api/extract-question/route.ts) — no client-side OCR, no Tesseract.
- Curriculum-grounded retrieval in [`lib/retrieval.ts`](lib/retrieval.ts) — language-aware Unicode-safe keyword overlap over [`data/textbook-excerpts.json`](data/textbook-excerpts.json), top-2 excerpts injected into every model's prompt under a `<curriculum_context>` tag.
- The system prompt and JSON schema for every model are real and identical across providers.

**Simulated (for the local demo only):**
- The WhatsApp UI is a browser-rendered look-alike — the production version runs on actual WhatsApp via Meta's Business API.
- The "Online" status, double-blue-tick read receipts, and call icons are decorative.
- The hallucination demo scenario hard-codes one model's response to deliberately stage a disagreement, because in practice the three models often agree on textbook-grade questions and the audience needs to *see* what consensus does when they don't. The override is clearly labelled as `forceHallucinationDemo` in code and `lib/consensus.ts:HALLUCINATION_INJECTION` in source.
- The parent dashboard's "Concept tracker" pads with a few mock topics when there are <3 real conversations on file, so the page feels populated for first-time viewers.
- Persistence is `localStorage` only — no database, no auth, no analytics, no deployment config.

---

## Architecture at a glance

```
app/
  page.tsx                        WhatsApp-style chat (client)
  dashboard/page.tsx              Parent dashboard (client, reads localStorage)
  api/ask/route.ts                Question → consensus answer
  api/extract-question/route.ts   Image → extracted question text
components/
  ChatHeader, MessageList, MessageBubble, MessageInput,
  LanguageToggle, VerdictBadge, ConsensusPanel
lib/
  consensus.ts        ★ Brooks–Iyengar algorithm — the heart of the product
  models.ts             Three SDK adapters with a unified ModelResponse interface
  retrieval.ts          Keyword retrieval over textbook-excerpts.json
  prompts.ts            System prompts for tutor, consensus, judge, vision
  types.ts              Shared types
data/
  textbook-excerpts.json   16 Class 7-8 excerpts in Kannada/Hindi/English
  demo-scenarios.json      The three pre-loaded demo scenarios
public/demo-images/
  algebra-problem.svg      Hindi NCERT-style worksheet page (rasterized to PNG client-side)
```

---

## From this demo to production

The production target is WhatsApp via Meta's Business API plus a BSP (e.g. AiSensy, Gupshup). When that pipeline is in place:

- **`lib/consensus.ts`** carries over unchanged. This is the irreplaceable part.
- **`lib/models.ts`**, **`lib/prompts.ts`**, **`lib/retrieval.ts`**, **`data/textbook-excerpts.json`** all carry over unchanged.
- **`app/api/ask/route.ts`** and **`app/api/extract-question/route.ts`** are reused by the WhatsApp webhook handler instead of by the in-browser chat — same input contract, same output contract.
- The Next.js chat UI and the parent dashboard get replaced by WhatsApp itself plus a real backend dashboard.

What needs paperwork before code is the WhatsApp Business API approval and BSP onboarding — multi-week processes that don't gate any of the intelligence work in this repo.

---

## Built with

Next.js 14 · TypeScript · Tailwind · `@anthropic-ai/sdk` · `openai` · `@google/generative-ai` · `lucide-react` · `react-markdown` + `remark-math` + `rehype-katex` · `localStorage`. No database, no auth, no analytics, no deployment config — local demo only.
