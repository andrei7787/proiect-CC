import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { listMaterialsForCourse } from "../services/materialRepository.js";
import { getUserId } from "./auth.js";
import { json, problem } from "./response.js";

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  try {
    const courseId = event.pathParameters?.courseId;
    if (!courseId) throw new Error("courseId is required");
    return json(200, {
      materials: await listMaterialsForCourse(required("MATERIALS_TABLE"), courseId, getUserId(event))
    });
  } catch (error) {
    return problem(400, error instanceof Error ? error.message : "invalid request");
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
