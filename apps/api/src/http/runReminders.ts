import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { sendDueReminders } from "../async/sendReminders.js";
import { getUserId } from "./auth.js";
import { json, problem } from "./response.js";

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  try {
    const userId = getUserId(event);
    const today = new Date().toISOString().slice(0, 10);
    return json(200, { sent: await sendDueReminders(today, userId) });
  } catch (error) {
    return problem(400, error instanceof Error ? error.message : "invalid request");
  }
}
