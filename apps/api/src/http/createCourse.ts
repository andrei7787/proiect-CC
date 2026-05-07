import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { nanoid } from "nanoid";
import { parseCreateCourseInput } from "@ai-study-planner/shared";
import { createCourse } from "../services/courseRepository.js";
import { getUserId } from "./auth.js";
import { json, problem } from "./response.js";

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  try {
    const input = parseCreateCourseInput(JSON.parse(event.body ?? "{}"));
    const now = new Date().toISOString();
    const course = {
      courseId: nanoid(),
      userId: getUserId(event),
      ...input,
      createdAt: now,
      updatedAt: now
    };
    return json(201, await createCourse(required("COURSES_TABLE"), course));
  } catch (error) {
    return problem(400, error instanceof Error ? error.message : "invalid request");
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
