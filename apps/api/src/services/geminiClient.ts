export interface GeminiMaterialResult {
  summary: string;
  keyConcepts: string[];
  recommendedFocusAreas?: string[];
}

export async function analyzeStudyMaterial(input: {
  fileBytes: Uint8Array;
  contentType: string;
  fileName: string;
  apiKey: string;
}): Promise<GeminiMaterialResult> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: input.apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: [{
      role: "user",
      parts: [
        {
          text: [
            "Analyze this study material for a university student.",
            "Return JSON only with summary, keyConcepts, and recommendedFocusAreas.",
            `File name: ${input.fileName}`
          ].join("\n")
        },
        {
          inlineData: {
            mimeType: input.contentType,
            data: Buffer.from(input.fileBytes).toString("base64")
          }
        }
      ]
    }]
  });
  return parseGeminiJson(response.text ?? "{}");
}

function parseGeminiJson(text: string): GeminiMaterialResult {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned) as Partial<GeminiMaterialResult>;
  if (typeof parsed.summary !== "string") throw new Error("Gemini response missing summary");
  if (!Array.isArray(parsed.keyConcepts)) throw new Error("Gemini response missing keyConcepts");
  return {
    summary: parsed.summary,
    keyConcepts: parsed.keyConcepts.map(String),
    recommendedFocusAreas: Array.isArray(parsed.recommendedFocusAreas)
      ? parsed.recommendedFocusAreas.map(String)
      : undefined
  };
}
