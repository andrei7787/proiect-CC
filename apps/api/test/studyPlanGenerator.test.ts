import { describe, expect, it } from "vitest";
import { normalizeGeneratedPlan } from "../src/services/studyPlanGenerator";

describe("normalizeGeneratedPlan", () => {
  it("normalizes Gemini task output", () => {
    expect(normalizeGeneratedPlan({
      tasks: [{ date: "2026-06-01", title: "Review queues", description: "Study SQS basics", estimatedMinutes: 45 }]
    })).toEqual([
      { date: "2026-06-01", title: "Review queues", description: "Study SQS basics", estimatedMinutes: 45, status: "todo" }
    ]);
  });
});
