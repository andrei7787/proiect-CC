import { describe, expect, it } from "vitest";
import { parseCreateCourseInput } from "../src/validation";

describe("parseCreateCourseInput", () => {
  it("accepts a valid course request", () => {
    expect(parseCreateCourseInput({
      name: "Cloud Computing",
      examDate: "2026-06-10",
      difficulty: "hard",
      weeklyHoursAvailable: 8
    })).toEqual({
      name: "Cloud Computing",
      examDate: "2026-06-10",
      difficulty: "hard",
      weeklyHoursAvailable: 8
    });
  });

  it("rejects unsupported difficulty", () => {
    expect(() => parseCreateCourseInput({
      name: "Math",
      examDate: "2026-06-10",
      difficulty: "extreme",
      weeklyHoursAvailable: 4
    })).toThrow("difficulty must be easy, medium, or hard");
  });
});
