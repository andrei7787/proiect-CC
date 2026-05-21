import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { listCoursesByUser } from "../services/courseRepository.js";
import { listMaterialsForUser } from "../services/materialRepository.js";
import { listDueTasks, listNotificationsForUser } from "../services/reminderRepository.js";
import { getUserId } from "./auth.js";
import { json, problem } from "./response.js";

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  try {
    const userId = getUserId(event);
    const today = new Date().toISOString().slice(0, 10);
    const [courses, materials, todayTasks, notifications] = await Promise.all([
      listCoursesByUser(required("COURSES_TABLE"), userId),
      listMaterialsForUser(required("MATERIALS_TABLE"), userId),
      listDueTasks(required("TASKS_TABLE"), today, userId),
      listNotificationsForUser(required("NOTIFICATIONS_TABLE"), userId)
    ]);

    return json(200, {
      courses,
      todayTasks,
      deadlines: courses.map((course) => ({
        courseId: course.courseId,
        courseName: course.name,
        examDate: course.examDate
      })),
      summaries: materials
        .filter((material) => material.status === "ready" && material.summary)
        .map((material) => ({
          materialId: material.materialId,
          courseId: material.courseId,
          fileName: material.fileName,
          summary: material.summary,
          keyConcepts: material.keyConcepts ?? [],
          processedAt: material.processedAt
        })),
      notifications
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
