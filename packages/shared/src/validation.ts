import type { Difficulty } from "./types.js";

export interface CreateCourseInput {
  name: string;
  examDate: string;
  difficulty: Difficulty;
  weeklyHoursAvailable: number;
}

const difficulties = new Set(["easy", "medium", "hard"]);

export function parseCreateCourseInput(input: unknown): CreateCourseInput {
  if (!input || typeof input !== "object") throw new Error("request body must be an object");
  const body = input as Record<string, unknown>;

  if (typeof body.name !== "string" || body.name.trim().length < 2) throw new Error("name must be at least 2 characters");
  if (typeof body.examDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.examDate)) throw new Error("examDate must use YYYY-MM-DD");
  if (typeof body.difficulty !== "string" || !difficulties.has(body.difficulty)) throw new Error("difficulty must be easy, medium, or hard");
  if (typeof body.weeklyHoursAvailable !== "number" || body.weeklyHoursAvailable < 1 || body.weeklyHoursAvailable > 80) {
    throw new Error("weeklyHoursAvailable must be between 1 and 80");
  }

  return {
    name: body.name.trim(),
    examDate: body.examDate,
    difficulty: body.difficulty as Difficulty,
    weeklyHoursAvailable: body.weeklyHoursAvailable
  };
}
