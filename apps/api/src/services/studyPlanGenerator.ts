import type {
	Course,
	Material,
	StudyTaskStatus,
} from "@ai-study-planner/shared";

export interface GeneratedTask {
	date: string;
	title: string;
	description: string;
	estimatedMinutes: number;
	status: StudyTaskStatus;
}

export function normalizeGeneratedPlan(input: unknown): GeneratedTask[] {
	const tasks = (input as { tasks?: unknown[] }).tasks;
	if (!Array.isArray(tasks) || tasks.length === 0)
		throw new Error("Gemini returned no tasks");
	return tasks.map((task) => {
		const item = task as Record<string, unknown>;
		if (typeof item.date !== "string") throw new Error("task.date is required");
		if (typeof item.title !== "string")
			throw new Error("task.title is required");
		if (typeof item.description !== "string")
			throw new Error("task.description is required");
		const estimatedMinutes =
			typeof item.estimatedMinutes === "number" ? item.estimatedMinutes : 30;
		return {
			date: item.date,
			title: item.title,
			description: item.description,
			estimatedMinutes,
			status: "todo",
		};
	});
}

export async function generateStudyTasks(input: {
	course: Course;
	materials: Material[];
	apiKey: string;
}): Promise<GeneratedTask[]> {
	const { GoogleGenAI } = await import("@google/genai");
	const ai = new GoogleGenAI({ apiKey: input.apiKey });
	const response = await ai.models.generateContent({
		model: "gemini-2.5-flash",
		config: {
			maxOutputTokens: 4096,
			responseMimeType: "application/json",
			responseSchema: {
				type: "OBJECT",
				properties: {
					tasks: {
						type: "ARRAY",
						items: {
							type: "OBJECT",
							properties: {
								date: { type: "STRING", description: "YYYY-MM-DD" },
								title: { type: "STRING" },
								description: { type: "STRING" },
								estimatedMinutes: { type: "INTEGER" },
							},
							required: ["date", "title", "description", "estimatedMinutes"],
						},
					},
				},
				required: ["tasks"],
			},
		},
		contents: [
			{
				role: "user",
				parts: [{ text: buildStudyPlanPrompt(input.course, input.materials) }],
			},
		],
	});
	const text = response.text ?? "{}";
	try {
		return normalizeGeneratedPlan(parseJson(text));
	} catch (parseError) {
		console.error("Gemini raw response:", text.slice(0, 2000));
		console.error("Parse error:", parseError);
		throw parseError;
	}
}

export function buildStudyPlanPrompt(
	course: Course,
	materials: Material[],
	today = new Date().toISOString().slice(0, 10),
): string {
	return [
		"Create a dated study plan for a university student.",
		"Return ONLY valid JSON, no markdown, no code fences:",
		'Format: {"tasks":[{"date":"YYYY-MM-DD","title":"...","description":"...","estimatedMinutes":45}]}',
		`Include at least one task dated ${today} so the student can start today.`,
		`Course: ${course.name}`,
		`Exam date: ${course.examDate}`,
		`Difficulty: ${course.difficulty}`,
		`Weekly hours available: ${course.weeklyHoursAvailable}`,
		"Material insights:",
		...materials.map((material) =>
			[
				`- ${material.fileName}`,
				`  Summary: ${material.summary ?? ""}`,
				`  Key concepts: ${(material.keyConcepts ?? []).join(", ")}`,
			].join("\n"),
		),
	].join("\n");
}

function parseJson(text: string): unknown {
	let raw = text
		.trim()
		.replace(/^```(?:json)?\s*\n?/i, "")
		.replace(/\n?\s*```\s*$/i, "");

	const start = raw.indexOf("{");
	const end = raw.lastIndexOf("}");
	if (start >= 0 && end > start) {
		raw = raw.slice(start, end + 1);
	}

	try {
		return JSON.parse(raw);
	} catch (firstError) {
		raw = raw.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
		try {
			return JSON.parse(raw);
		} catch (secondError) {
			throw firstError;
		}
	}
}
