import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { listNotificationsForUser } from "../services/reminderRepository.js";
import { getUserId } from "./auth.js";
import { json, problem } from "./response.js";

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  try {
    return json(200, {
      notifications: await listNotificationsForUser(required("NOTIFICATIONS_TABLE"), getUserId(event))
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
