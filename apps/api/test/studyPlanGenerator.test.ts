import { describe, expect, it } from "vitest";
import { buildStudyPlanPrompt, normalizeGeneratedPlan } from "../src/services/studyPlanGenerator";

describe("normalizeGeneratedPlan", () => {
  it("normalizes Gemini task output", () => {
    expect(normalizeGeneratedPlan({
      tasks: [{ date: "2026-06-01", title: "Review queues", description: "Study SQS basics", estimatedMinutes: 45 }]
    })).toEqual([
      { date: "2026-06-01", title: "Review queues", description: "Study SQS basics", estimatedMinutes: 45, status: "todo" }
    ]);
  });

  it("asks Gemini to include at least one task dated today", () => {
    const prompt = buildStudyPlanPrompt({
      courseId: "course-1",
      userId: "user-1",
      name: "Cloud Computing",
      examDate: "2026-06-10",
      difficulty: "hard",
      weeklyHoursAvailable: 8,
      createdAt: "2026-05-20T10:00:00.000Z",
      updatedAt: "2026-05-20T10:00:00.000Z"
    }, [], "2026-05-20");

    expect(prompt).toContain("Include at least one task dated 2026-05-20");
  });
});
