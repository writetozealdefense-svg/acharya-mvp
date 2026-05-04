# Acharya — demo walkthroughs

Three pre-built scenarios, designed to be run live in front of Dr. Iyengar, advisors, or seed investors. Each one is a 60–90 second moment with a specific point to make.

The order below is the recommended order. Demo 1 establishes that the product works for a real Indian student in a real Indian language. Demo 2 establishes that real-world inputs (a photo of a textbook page) flow through the same engine. Demo 3 is the hero moment — the only reason anyone should care about Brooks–Iyengar consensus.

---

## Pre-flight checklist (do this once before the meeting)

1. **Keys configured.** Open `.env.local` and confirm all three keys are filled in. Missing keys don't crash the app — but they show as red "fail" cards in the consensus panel, which dilutes the story.
2. **Dev server running.** `npm run dev` in a terminal. Wait for `✓ Ready in ~2s`. Leave it running.
3. **Browser open at <http://localhost:3000>.** Use a clean window — close devtools, hide bookmarks bar. The chat is centered in a phone-width pane on a neutral background, so a non-technical viewer should briefly think it might be WhatsApp.
4. **Clear chat history** if there's old test data. Header (⋮) → *Clear chat*. Demos read better on an empty canvas.
5. **Consensus toggle: OFF** to start. The first impression should be a clean WhatsApp chat. You'll turn it on partway through Demo 1.
6. **Language toggle: EN** to start. Each demo will switch this on its own when you pick it from the menu.

---

## Demo 1 — Class 7 Kannada chemistry: "Oxygen vs CO₂"

**The point:** Acharya works in vernacular languages, end to end. A child in Hubballi can ask in Kannada and get a tutoring answer in Kannada — not a translation layer bolted onto an English chatbot.

**Setting (one line for the room):** *"This is what a Class 7 girl in Hubballi sees when she opens WhatsApp on her father's phone after dinner."*

### How to trigger it

- Header (⋮) menu → **Demo scenarios** → **Class 7 · Kannada · Oxygen vs CO₂**

The chat auto-fills the question `ಆಮ್ಲಜನಕ ಮತ್ತು ಇಂಗಾಲದ ಡೈಆಕ್ಸೈಡ್ ನಡುವಿನ ವ್ಯತ್ಯಾಸವೇನು?` ("What is the difference between oxygen and carbon dioxide?"), the language toggle flips to ಕನ್ನಡ, and the message sends automatically. You'll see typing dots, then the answer.

### What to narrate while it's loading

> "Behind the scenes right now, Acharya is calling three independent LLMs in parallel — Claude Sonnet from Anthropic, GPT-4o-mini from OpenAI, Gemini 2.0 Flash from Google. It's also pulling the relevant Kannada textbook excerpt from the Karnataka State Board syllabus and giving it to all three models as grounding context. None of them sees the others' answers — that's the whole premise of independent voting."

That fills ~10 seconds, which is roughly how long the round-trip takes.

### What you should see

- A green ✓ **Verified** badge in the top-right of the answer bubble.
- The answer is in Kannada, ~3–5 sentences, comparing the two gases. (Models often mention oxygen supports respiration / combustion and CO₂ is exhaled / used in photosynthesis.)
- Latency: typically 5–9 seconds.

### The reveal — toggle "Show consensus reasoning"

Click the checkbox in the dark green strip at the top: **Show consensus reasoning**. The panel expands under the answer.

Point at three things, in this order:

1. **Three columns, one per model.** "Each model gave its own answer in Kannada and listed its key facts in English so they can be compared."
2. **The fact-scoring grid.** "These green pills are facts where the other two models agreed. Amber means one of two agreed. Red would mean an outlier — none agreed."
3. **The 'Chosen' badge** on whichever model won. "Brooks–Iyengar picked this model because its surviving facts had the highest agreement and its confidence was highest among the eligible models."

If all three columns are green, the verdict is Verified. That's the boring success case — and that's exactly what you want for a basic curriculum question.

### Troubleshooting

- **Verdict comes back "Needs human review."** Usually one of the model keys is wrong or rate-limited. Look at the panel — any model with a red "fail" card is not authenticating. Fix the key and ask again.
- **Answer comes back in English instead of Kannada.** The detect-language instruction is in the system prompt; if the model failed to follow it, that's actually a useful illustration of *why* you check answers across multiple models. Move on.

---

## Demo 2 — Class 8 Hindi algebra image upload

**The point:** A parent doesn't type questions — they take a photo of a textbook page on their child's homework. Acharya extracts the question with Claude's native vision (no Tesseract, no client-side OCR) and runs it through the same consensus engine. *Same engine, real-world input.*

**Setting:** *"This is the parent in Indore. He doesn't type Hindi on the phone keyboard — he just snaps a photo of the page his daughter is stuck on."*

### How to trigger it

- Header (⋮) → **Demo scenarios** → **Class 8 · Hindi · Algebra image upload**

Behind the scenes the page rasterizes the bundled SVG worksheet to a PNG (Claude vision wants PNG/JPEG/WebP/GIF), POSTs it to `/api/extract-question`, gets back the extracted question text, and auto-sends it with the image attached to the message. You'll see the photo appear in a user message bubble, then typing dots, then the answer.

### What's in the image

A faux NCERT Class 8 Mathematics page (Chapter 2, "एक चर वाले रैखिक समीकरण" — Linear equations in one variable). The central problem is highlighted with a red dashed circle:

```
प्रश्न 3.  निम्न समीकरण को हल कीजिए:

           2x + 3 = 11
```

Two more questions follow below (a 5y - 7 = 18 problem and a word problem) — they're decorative, included to test that the vision model picks the *circled* one rather than just the first one on the page.

### What to narrate

> "Watch — the photo of the page goes up in the message. Acharya is using Claude Sonnet's native vision to read the page, find the circled problem, and pull out just that question. Then the same three-model consensus engine that handled the Kannada question solves it step-by-step. Notice it didn't pick the other two questions on the page — Claude Sonnet specifically identified the marked one."

### What you should see

- The image appears in the user bubble at the top of the new exchange.
- The extracted question text — `2x + 3 = 11` or `निम्न समीकरण को हल कीजिए: 2x + 3 = 11` — appears below the image (or as a separate message).
- The answer is a step-by-step solution: subtract 3 from both sides → `2x = 8` → divide by 2 → `x = 4`. Likely with a verification step at the end.
- The textbook excerpt from `data/textbook-excerpts.json` covering linear equations gets retrieved and is in each model's grounding context (visible if you toggle consensus reasoning on).

### Why this matters

Two things in one moment:

1. **The intake is realistic.** No parent will ever type `2x + 3 = 11` into a chat. They'll snap the page. Acharya is built for that input shape from day one.
2. **The same engine handles it.** The vision step is just an upstream stage — once the question is extracted, the exact pipeline from Demo 1 runs. Three models, fact-agreement scoring, verdict assignment.

### Troubleshooting

- **Vision returns `NO_QUESTION_FOUND`.** Rare with the bundled image, but if Claude has trouble with the SVG rasterization, the alert prompts you to type a question manually. Recover by typing `Solve 2x + 3 = 11` and continuing.
- **Wrong question gets extracted.** If the vision model picks question 4 or 5 instead of the circled one, that's still informative — it shows what the audience would see in the wild. The consensus engine still runs on whatever was extracted.

---

## Demo 3 — The hallucination catch ★ (the hero moment)

**The point:** This is why Brooks–Iyengar is in the product. When models disagree, a single-LLM tutor would confidently teach a wrong fact. Acharya catches it.

**Setting:** *"Here's the case nobody outside our advisor circle has shown publicly. This is the failure mode of every AI tutor on the market today."*

> **A note on honesty.** This scenario uses a hardcoded override. In our own testing, all three models often agreed on this question. To reliably show what consensus does *when models disagree*, we replace one model's vote with a deliberately wrong, confidently-stated answer. The override is a single named constant — `HALLUCINATION_INJECTION` in [`lib/consensus.ts`](lib/consensus.ts) — and is documented in the README's "what's simulated" section. We tell viewers this on the way in. The disagreement is staged, but everything the engine does to catch it is real.

### How to trigger it

- Header (⋮) → **Demo scenarios** → **The hallucination catch — who invented zero?**

The chat auto-sends the question `Who invented the number zero — Aryabhata or Brahmagupta?`. Before you click, **make sure "Show consensus reasoning" is ON** — the entire payoff is in the panel.

### What you should see

- The answer bubble lands with an amber ⚠ **Likely correct** badge or a red 🚫 **Needs human review** badge — *not* green Verified.
- The expanded consensus panel below the bubble shows three columns:
  - **Claude Sonnet:** likely correctly attributes the symbolic/conceptual zero to Brahmagupta (628 CE, *Brahmasphutasiddhanta*). Most facts in green pills.
  - **GPT-4o-mini:** confidently asserts Aryabhata invented zero (the hardcoded vote). Its facts are in **red pills** — outliers, no agreement from the other two.
  - **Gemini 2.0 Flash:** typically also goes with Brahmagupta or gives a more nuanced "both contributed" answer. Mixed pills.
- **The "Chosen" badge is NOT on GPT-4o-mini.** It's on Claude or Gemini, because GPT's facts didn't survive Brooks–Iyengar fusion.
- The bottom strip explains *why* in one sentence: typically *"Subject agreement: history (3/3). 7/10 facts had agreement (≥1). Falling back to highest-confidence eligible model — Claude Sonnet."*

### What to narrate

The flow has three beats. Don't skip any.

**Beat 1 — set up the failure mode.**

> "On most other AI tutors, this would just give you whatever GPT said and stamp it 'AI-generated, may be wrong.' Watch what happens here."

**Beat 2 — point at the red pills as soon as the panel expands.**

> "GPT-4o-mini is the loud, confident, wrong one in this scenario. 90% confidence, zero of its key facts agree with the other two models. That makes them outliers — these red pills."

**Beat 3 — point at the green/amber pills and the Chosen badge.**

> "The other two models converge on Brahmagupta. Their facts agree, they get green pills. The engine discards GPT's outliers, picks the answer from the highest-confidence model whose claims survived, and downgrades the verdict from Verified to Needs human review. The child never saw the wrong answer."

### Why this lands with Dr. Iyengar specifically

Dr. Iyengar published the Brooks–Iyengar algorithm to address exactly this class of problem in distributed sensor networks: when individual nodes can be faulty, you don't trust any one node's reading — you fuse the inputs in a way that's tolerant of a minority of bad signals. This product is a textbook application of that principle to LLM outputs treated as faulty sensors. The panel he sees is, structurally, the same kind of agreement graph he's been working with for two decades.

### What to do if the demo doesn't look like the description

The variance in this scenario comes from Claude and Gemini's actual answers — they sometimes give "both contributed" answers that score differently. The hardcoded GPT response is constant, but its score depends on what the other two say.

- **Verdict is Verified instead of Likely correct / Needs review.** This means Claude and Gemini answered with content that happens to agree with the GPT-injected facts (e.g. both mention Aryabhata at all). Open the panel, point at the red pills on GPT's column anyway, and explain: "Even when the verdict isn't downgraded, the engine surfaces which facts are outliers — that's the same diagnostic signal."
- **All three columns look identical.** The hardcoded injection didn't fire. Verify in code: open `lib/consensus.ts`, search for `HALLUCINATION_INJECTION` — it should be in the array `Promise.all` and gated by `opts.forceHallucinationDemo`. Verify in `data/demo-scenarios.json` that the third scenario has `"forceHallucinationDemo": true`.
- **Verdict is Needs human review and you wanted Likely correct.** That's actually the most dramatic outcome — go with it.

---

## After the three demos

Two natural follow-ups:

1. **Open the parent dashboard.** Header (⋮) → **Parent dashboard**. Show the subject pie chart, concept tracker, and recent-questions list. The point: "This is what the parent sees in their app — they don't see the consensus panel, they see whether their child is getting verified answers in math vs struggling in chemistry."
2. **Switch to ad-hoc questions.** Type something off-script in any of the three languages and let the consensus run live. The audience has now seen the staged version; live questions prove the engine works on anything.

If anyone asks "what's real and what's simulated?" — point them at the section of the same name in the [README](README.md). It's the first thing they should see if they're skeptical.
