import { describe, expect, it, vi } from "vitest";
import { handler } from "../src/http/createCourse";

vi.mock("../src/services/courseRepository", () => ({
  createCourse: vi.fn(async (_tableName, course) => course)
}));

const event = {
  body: JSON.stringify({
    name: "Cloud Computing",
    examDate: "2026-06-10",
    difficulty: "hard",
    weeklyHoursAvailable: 8
  }),
  requestContext: {
    authorizer: { jwt: { claims: { sub: "user-1" } } }
  }
} as any;

describe("createCourse handler", () => {
  it("creates a course for the authenticated user", async () => {
    process.env.COURSES_TABLE = "Courses";
    const response = await handler(event);
    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toMatchObject({
      userId: "user-1",
      name: "Cloud Computing",
      difficulty: "hard"
    });
  });
});
