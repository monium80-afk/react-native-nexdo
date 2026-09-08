// Server-only: imported exclusively by app/api/**/+api.ts route handlers,
// which run on the Expo server runtime, not in the app bundle — this is
// what keeps GEMINI_API_KEY (no EXPO_PUBLIC_ prefix) out of the client.
// See AGENTS.md "AI / Stream / Vision Agent Rules".

// Rolling alias that always points at the latest stable Flash release —
// avoids hardcoding a version string that goes stale. Pin an exact version
// here (e.g. "gemini-3.8-flash") if you need reproducible outputs.
const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export type GeminiJsonSchema = Record<string, unknown>;

export async function generateStructuredJson(params: {
  systemPrompt: string;
  userContent: string;
  responseSchema: GeminiJsonSchema;
}): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Add GEMINI_API_KEY to your .env file");
  }

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: params.systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: params.userContent }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: params.responseSchema,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Gemini response had no text content");
  }
  return JSON.parse(text);
}
