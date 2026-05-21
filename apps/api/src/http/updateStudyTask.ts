import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import type { StudyTaskStatus } from "@ai-study-planner/shared";
import { getStudyTask, updateStudyTaskStatus } from "../services/studyPlanRepository.js";
import { getUserId } from "./auth.js";
import { json, problem } from "./response.js";

const validStatuses = new Set(["todo", "done", "skipped"]);

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  try {
    const userId = getUserId(event);
    const taskId = event.pathParameters?.taskId;
    if (!taskId) throw new Error("taskId is required");
    const { status } = parseInput(JSON.parse(event.body ?? "{}"));
    const tableName = required("TASKS_TABLE");
    const task = await getStudyTask(tableName, taskId);
    if (!task || task.userId !== userId) throw new Error("task not found");
    return json(200, await updateStudyTaskStatus(tableName, taskId, status));
  } catch (error) {
    return problem(400, error instanceof Error ? error.message : "invalid request");
  }
}

function parseInput(input: unknown): { status: StudyTaskStatus } {
  if (!input || typeof input !== "object") throw new Error("request body must be an object");
  const status = (input as Record<string, unknown>).status;
  if (typeof status !== "string" || !validStatuses.has(status)) {
    throw new Error("status must be todo, done, or skipped");
  }
  return { status: status as StudyTaskStatus };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
