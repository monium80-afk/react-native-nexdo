import { extractTextFromMedia } from "@/lib/ai/gemini";
import type { AppLanguage } from "@/types/settings";

export type ExtractTextRequestBody = {
  mimeType: string;
  base64: string;
  kind: "photo" | "voice" | "document";
  /** The app language — used for any description the model writes itself. */
  language?: AppLanguage;
};

export type ExtractTextResponseBody = { text: string };

const INSTRUCTIONS: Record<ExtractTextRequestBody["kind"], string> = {
  photo:
    "Extract every piece of text and action item visible in this image, and describe anything relevant to a to-do list (e.g. a whiteboard, a note, a screenshot of a message). Output plain text only, exactly as if the user had typed it themselves — no commentary, no markdown.",
  voice: "Transcribe this audio recording verbatim into plain text. Output only the transcription, no commentary.",
  document:
    "Extract the text content of this file, focusing on anything that reads like tasks, deadlines, or action items. Output plain text only, exactly as if the user had typed it themselves — no commentary, no markdown.",
};

// Text that's already in the image/file stays in its own language; only what
// the model writes in its own words (a description) follows the app language.
const DESCRIPTION_LANGUAGE: Partial<Record<AppLanguage, string>> = {
  fr: " Keep extracted text in its original language, but write any description of your own in French.",
};

export async function POST(request: Request) {
  const body = (await request.json()) as ExtractTextRequestBody;
  const languageNote = body.kind === "voice" || !body.language ? "" : (DESCRIPTION_LANGUAGE[body.language] ?? "");

  try {
    const text = await extractTextFromMedia({
      mimeType: body.mimeType,
      base64: body.base64,
      instruction: `${INSTRUCTIONS[body.kind] ?? INSTRUCTIONS.document}${languageNote}`,
    });
    return Response.json({ text } satisfies ExtractTextResponseBody);
  } catch (error) {
    console.error("[api/extract-text]", error);
    return Response.json({ text: "" } satisfies ExtractTextResponseBody, { status: 200 });
  }
}
