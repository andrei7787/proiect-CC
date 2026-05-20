import { describe, expect, it, vi } from "vitest";
import { handler } from "../src/http/listCourseTasks";
import { listStudyTasksForCourse } from "../src/services/studyPlanRepository";

vi.mock("../src/services/studyPlanRepository", () => ({
  listStudyTasksForCourse: vi.fn(async () => [{
    taskId: "task-1",
    planId: "plan-1",
    courseId: "course-1",
    userId: "user-1",
    date: "2026-05-20",
    title: "Review Lambda",
    description: "Review event source mappings.",
    estimatedMinutes: 30,
    status: "todo"
  }])
}));

const event = {
  pathParameters: { courseId: "course-1" },
  requestContext: {
    authorizer: { jwt: { claims: { sub: "user-1" } } }
  }
} as any;

describe("listCourseTasks handler", () => {
  it("lists study tasks for the authenticated user's course", async () => {
    process.env.TASKS_TABLE = "StudyTasks";

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      tasks: [{
        taskId: "task-1",
        planId: "plan-1",
        courseId: "course-1",
        userId: "user-1",
        date: "2026-05-20",
        title: "Review Lambda",
        description: "Review event source mappings.",
        estimatedMinutes: 30,
        status: "todo"
      }]
    });
    expect(listStudyTasksForCourse).toHaveBeenCalledWith("StudyTasks", "course-1", "user-1");
  });
});
