import { NextResponse } from "next/server";
import { extractQuestionFromImage } from "@/lib/models";
import { VISION_EXTRACT_PROMPT } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ExtractRequestBody {
  imageDataUrl: string;
}

const SUPPORTED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  let body: ExtractRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const dataUrl = body.imageDataUrl ?? "";
  const m = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!m) {
    return NextResponse.json(
      { error: "imageDataUrl must be a data:image/...;base64,... URL" },
      { status: 400 },
    );
  }
  const mediaType = m[1].toLowerCase();
  const b64 = m[2];

  if (!SUPPORTED.has(mediaType)) {
    return NextResponse.json(
      {
        error: `Unsupported image type: ${mediaType}. Supported: png, jpeg, webp, gif.`,
      },
      { status: 400 },
    );
  }

  try {
    const text = await extractQuestionFromImage(
      b64,
      mediaType as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
      VISION_EXTRACT_PROMPT,
    );
    const cleaned = text.trim();
    const noQuestion = cleaned === "NO_QUESTION_FOUND" || /NO_QUESTION_FOUND/i.test(cleaned);
    return NextResponse.json({
      question: noQuestion ? "" : cleaned,
      no_question_found: noQuestion,
      raw: cleaned,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
