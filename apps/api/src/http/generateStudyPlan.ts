import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { nanoid } from "nanoid";
import { generateStudyTasks } from "../services/studyPlanGenerator.js";
import { createStudyPlanWithTasks, getCourse, listReadyMaterials } from "../services/studyPlanRepository.js";
import { getUserId } from "./auth.js";
import { json, problem } from "./response.js";

const secrets = new SecretsManagerClient({});

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  try {
    const userId = getUserId(event);
    const { courseId } = parseInput(JSON.parse(event.body ?? "{}"));
    const course = await getCourse(required("COURSES_TABLE"), courseId);
    if (!course || course.userId !== userId) throw new Error("course not found");
    const materials = await listReadyMaterials(required("MATERIALS_TABLE"), courseId, userId);
    if (materials.length === 0) throw new Error("no ready materials found");
    const generatedTasks = await generateStudyTasks({
      course,
      materials,
      apiKey: await getGeminiApiKey()
    });
    const now = new Date().toISOString();
    const planId = nanoid();
    const plan = {
      planId,
      courseId,
      userId,
      generatedFromMaterialIds: materials.map((material) => material.materialId),
      startDate: now.slice(0, 10),
      examDate: course.examDate,
      createdAt: now
    };
    const tasks = generatedTasks.map((task) => ({
      taskId: nanoid(),
      planId,
      courseId,
      userId,
      ...task
    }));
    return json(201, await createStudyPlanWithTasks({
      plansTable: required("STUDY_PLANS_TABLE"),
      tasksTable: required("TASKS_TABLE"),
      plan,
      tasks
    }));
  } catch (error) {
    return problem(400, error instanceof Error ? error.message : "invalid request");
  }
}

function parseInput(input: unknown): { courseId: string } {
  if (!input || typeof input !== "object") throw new Error("request body must be an object");
  const courseId = (input as Record<string, unknown>).courseId;
  if (typeof courseId !== "string" || courseId.length === 0) throw new Error("courseId is required");
  return { courseId };
}

async function getGeminiApiKey(): Promise<string> {
  const secret = await secrets.send(new GetSecretValueCommand({ SecretId: required("GEMINI_API_KEY_SECRET_ID") }));
  if (!secret.SecretString) throw new Error("Gemini secret is empty");
  return secret.SecretString;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
