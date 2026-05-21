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
  const promptText = [
    "Analyze this study material for a university student.",
    "Return JSON only with summary, keyConcepts, and recommendedFocusAreas.",
    `File name: ${input.fileName}`
  ];

  const isText = input.contentType === "text/plain" || input.contentType === "text/markdown";
  const isPdf = input.contentType === "application/pdf";
  let materialContent = "";

  if (isText) {
    materialContent = new TextDecoder().decode(input.fileBytes);
  } else if (isPdf) {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjsLib.getDocument(input.fileBytes).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.filter((item) => "str" in item).map((item) => (item as { str: string }).str).join(" "));
    }
    materialContent = pages.join("\n");
  } else {
    materialContent = new TextDecoder().decode(input.fileBytes);
  }

  if (!materialContent.trim()) throw new Error("could not extract text from material");

  const parts = [{
    text: promptText.join("\n") + "\n\nMaterial content:\n" + materialContent
  }];

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: [{ role: "user", parts }]
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
