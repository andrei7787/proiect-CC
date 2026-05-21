import { describe, expect, it, vi } from "vitest";
import { handler } from "../src/http/getDashboard";
import { listCoursesByUser } from "../src/services/courseRepository";
import { listMaterialsForUser } from "../src/services/materialRepository";
import { listDueTasks, listNotificationsForUser } from "../src/services/reminderRepository";

vi.mock("../src/services/courseRepository", () => ({
  listCoursesByUser: vi.fn(async () => [{
    courseId: "course-1",
    userId: "user-1",
    name: "Cloud Computing",
    examDate: "2026-06-10",
    difficulty: "hard",
    weeklyHoursAvailable: 8,
    createdAt: "2026-05-20T10:00:00.000Z",
    updatedAt: "2026-05-20T10:00:00.000Z"
  }])
}));

vi.mock("../src/services/materialRepository", () => ({
  listMaterialsForUser: vi.fn(async () => [{
    materialId: "mat-1",
    courseId: "course-1",
    userId: "user-1",
    fileName: "serverless.pdf",
    s3Key: "user-1/course-1/mat-1-serverless.pdf",
    contentType: "application/pdf",
    status: "ready",
    summary: "Queues decouple producers from processors.",
    keyConcepts: ["SQS"],
    createdAt: "2026-05-20T10:00:00.000Z",
    processedAt: "2026-05-20T10:01:00.000Z"
  }])
}));

vi.mock("../src/services/reminderRepository", () => ({
  listDueTasks: vi.fn(async () => [{
    taskId: "task-1",
    planId: "plan-1",
    courseId: "course-1",
    userId: "user-1",
    date: "2026-05-20",
    title: "Review SQS",
    description: "Review queue basics.",
    estimatedMinutes: 30,
    status: "todo"
  }]),
  listNotificationsForUser: vi.fn(async () => [{
    notificationId: "notification-1",
    userId: "user-1",
    taskId: "task-1",
    type: "study-task",
    message: "Reminder: Review SQS is due today",
    status: "created",
    createdAt: "2026-05-20T11:00:00.000Z"
  }])
}));

const event = {
  requestContext: {
    authorizer: { jwt: { claims: { sub: "user-1" } } }
  }
} as any;

describe("getDashboard handler", () => {
  it("returns authenticated dashboard data from real tables", async () => {
    process.env.COURSES_TABLE = "Courses";
    process.env.MATERIALS_TABLE = "Materials";
    process.env.TASKS_TABLE = "StudyTasks";
    process.env.NOTIFICATIONS_TABLE = "Notifications";

    const today = new Date().toISOString().slice(0, 10);
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      courses: [{
        courseId: "course-1",
        userId: "user-1",
        name: "Cloud Computing",
        examDate: "2026-06-10",
        difficulty: "hard",
        weeklyHoursAvailable: 8,
        createdAt: "2026-05-20T10:00:00.000Z",
        updatedAt: "2026-05-20T10:00:00.000Z"
      }],
      todayTasks: [{
        taskId: "task-1",
        planId: "plan-1",
        courseId: "course-1",
        userId: "user-1",
        date: "2026-05-20",
        title: "Review SQS",
        description: "Review queue basics.",
        estimatedMinutes: 30,
        status: "todo"
      }],
      deadlines: [{
        courseId: "course-1",
        courseName: "Cloud Computing",
        examDate: "2026-06-10"
      }],
      summaries: [{
        materialId: "mat-1",
        courseId: "course-1",
        fileName: "serverless.pdf",
        summary: "Queues decouple producers from processors.",
        keyConcepts: ["SQS"],
        processedAt: "2026-05-20T10:01:00.000Z"
      }],
      notifications: [{
        notificationId: "notification-1",
        userId: "user-1",
        taskId: "task-1",
        type: "study-task",
        message: "Reminder: Review SQS is due today",
        status: "created",
        createdAt: "2026-05-20T11:00:00.000Z"
      }]
    });
    expect(listCoursesByUser).toHaveBeenCalledWith("Courses", "user-1");
    expect(listMaterialsForUser).toHaveBeenCalledWith("Materials", "user-1");
    expect(listDueTasks).toHaveBeenCalledWith("StudyTasks", today, "user-1");
    expect(listNotificationsForUser).toHaveBeenCalledWith("Notifications", "user-1");
  });
});
