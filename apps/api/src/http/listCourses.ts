import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { listCoursesByUser } from "../services/courseRepository.js";
import { getUserId } from "./auth.js";
import { json, problem } from "./response.js";

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  try {
    const tableName = process.env.COURSES_TABLE;
    if (!tableName) throw new Error("COURSES_TABLE is required");
    return json(200, { courses: await listCoursesByUser(tableName, getUserId(event)) });
  } catch (error) {
    return problem(400, error instanceof Error ? error.message : "invalid request");
  }
}
