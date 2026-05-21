import type { Course, Material, StudyTaskStatus } from "@ai-study-planner/shared";

export interface GeneratedTask {
  date: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  status: StudyTaskStatus;
}

export function normalizeGeneratedPlan(input: unknown): GeneratedTask[] {
  const tasks = (input as { tasks?: unknown[] }).tasks;
  if (!Array.isArray(tasks) || tasks.length === 0) throw new Error("Gemini returned no tasks");
  return tasks.map((task) => {
    const item = task as Record<string, unknown>;
    if (typeof item.date !== "string") throw new Error("task.date is required");
    if (typeof item.title !== "string") throw new Error("task.title is required");
    if (typeof item.description !== "string") throw new Error("task.description is required");
    const estimatedMinutes = typeof item.estimatedMinutes === "number" ? item.estimatedMinutes : 30;
    return {
      date: item.date,
      title: item.title,
      description: item.description,
      estimatedMinutes,
      status: "todo"
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
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: buildStudyPlanPrompt(input.course, input.materials) }] }],
    config: { maxOutputTokens: 4096 },
  });
  return normalizeGeneratedPlan(parseJson(response.text ?? "{}"));
}

export function buildStudyPlanPrompt(
  course: Course,
  materials: Material[],
  today = new Date().toISOString().slice(0, 10)
): string {
  return [
    "Create a dated study plan for a university student.",
    "Return JSON only: {\"tasks\":[{\"date\":\"YYYY-MM-DD\",\"title\":\"...\",\"description\":\"...\",\"estimatedMinutes\":45}]}",
    `Include at least one task dated ${today} so the student can start today.`,
    `Course: ${course.name}`,
    `Exam date: ${course.examDate}`,
    `Difficulty: ${course.difficulty}`,
    `Weekly hours available: ${course.weeklyHoursAvailable}`,
    "Material insights:",
    ...materials.map((material) => [
      `- ${material.fileName}`,
      `  Summary: ${material.summary ?? ""}`,
      `  Key concepts: ${(material.keyConcepts ?? []).join(", ")}`
    ].join("\n"))
  ].join("\n");
}

function parseJson(text: string): unknown {
  return JSON.parse(text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, ""));
}
