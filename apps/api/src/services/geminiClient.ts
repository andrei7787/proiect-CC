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
		`File name: ${input.fileName}`,
	].join("\n");

	const isPdf = input.contentType === "application/pdf";

	const parts: Array<{
		text?: string;
		inlineData?: { mimeType: string; data: string };
	}> = [{ text: promptText }];

	if (isPdf) {
		// Send PDF directly to Gemini (native PDF support)
		parts.push({
			inlineData: {
				mimeType: "application/pdf",
				data: Buffer.from(input.fileBytes).toString("base64"),
			},
		});
	} else {
		// Extract text for TXT/MD files
		const materialContent = new TextDecoder().decode(input.fileBytes);
		if (!materialContent.trim())
			throw new Error("could not extract text from material");
		parts.push({ text: `Material content:\n${materialContent}` });
	}

	const response = await ai.models.generateContent({
		model: "gemini-2.5-flash",
		contents: [{ role: "user", parts }],
	});
	return parseGeminiJson(response.text ?? "{}");
}

function parseGeminiJson(text: string): GeminiMaterialResult {
	const cleaned = text
		.trim()
		.replace(/^```json\s*/i, "")
		.replace(/^```\s*/i, "")
		.replace(/\s*```$/i, "");
	const parsed = JSON.parse(cleaned) as Partial<GeminiMaterialResult>;
	if (typeof parsed.summary !== "string")
		throw new Error("Gemini response missing summary");
	if (!Array.isArray(parsed.keyConcepts))
		throw new Error("Gemini response missing keyConcepts");
	return {
		summary: parsed.summary,
		keyConcepts: parsed.keyConcepts.map(String),
		recommendedFocusAreas: Array.isArray(parsed.recommendedFocusAreas)
			? parsed.recommendedFocusAreas.map(String)
			: undefined,
	};
}
