import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiRequest,
  createCourse,
  createMaterialUpload,
  generateStudyPlan,
  getDashboard,
  listCourseMaterials,
  listCourseTasks,
  listCourses,
  queueMaterialProcessing,
  runReminders,
  updateStudyTaskStatus,
  uploadFileToUrl
} from "./client";

describe("apiRequest", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the provided token as a bearer authorization header", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => (
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    ));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/courses", { token: "id-token-1" });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0];
    if (!init) throw new Error("fetch init is required");
    const headers = init.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer id-token-1");
  });

  it("loads courses from the protected courses route", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      courses: [{
        courseId: "course-1",
        userId: "user-1",
        name: "Cloud Computing",
        examDate: "2026-06-10",
        difficulty: "hard",
        weeklyHoursAvailable: 8,
        createdAt: "2026-05-14T00:00:00.000Z",
        updatedAt: "2026-05-14T00:00:00.000Z"
      }]
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const courses = await listCourses("id-token-1");

    expect(courses).toHaveLength(1);
    expect(courses[0].name).toBe("Cloud Computing");
    expect(fetchMock).toHaveBeenCalledWith("/courses", expect.objectContaining({ method: "GET" }));
  });

  it("loads dashboard data from the protected dashboard route", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      courses: [],
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
      deadlines: [{ courseId: "course-1", courseName: "Cloud Computing", examDate: "2026-06-10" }],
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
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const dashboard = await getDashboard("id-token-1");

    expect(dashboard.todayTasks[0].title).toBe("Review SQS");
    expect(dashboard.deadlines[0].courseName).toBe("Cloud Computing");
    expect(dashboard.summaries[0].summary).toBe("Queues decouple producers from processors.");
    expect(dashboard.notifications[0].message).toBe("Reminder: Review SQS is due today");
    expect(fetchMock).toHaveBeenCalledWith("/dashboard", expect.objectContaining({ method: "GET" }));
  });

  it("creates a material upload request", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      material: {
        materialId: "mat-1",
        courseId: "course-1",
        userId: "user-1",
        fileName: "serverless.pdf",
        s3Key: "user-1/course-1/mat-1-serverless.pdf",
        contentType: "application/pdf",
        status: "uploaded",
        createdAt: "2026-05-20T10:00:00.000Z"
      },
      uploadUrl: "https://upload.example/mat-1"
    }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createMaterialUpload("id-token-1", {
      courseId: "course-1",
      fileName: "serverless.pdf",
      contentType: "application/pdf"
    });

    expect(result.uploadUrl).toBe("https://upload.example/mat-1");
    expect(fetchMock).toHaveBeenCalledWith("/materials/upload", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        courseId: "course-1",
        fileName: "serverless.pdf",
        contentType: "application/pdf"
      })
    }));
  });

  it("uploads a file to the presigned URL without the API auth wrapper", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["pdf"], "serverless.pdf", { type: "application/pdf" });

    await uploadFileToUrl("https://upload.example/mat-1", file);

    expect(fetchMock).toHaveBeenCalledWith("https://upload.example/mat-1", expect.objectContaining({
      method: "PUT",
      body: file
    }));
  });

  it("queues material processing", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ queued: true, materialId: "mat-1" }), { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    await queueMaterialProcessing("id-token-1", "mat-1");

    expect(fetchMock).toHaveBeenCalledWith("/materials/mat-1/process", expect.objectContaining({ method: "POST" }));
  });

  it("lists materials for a course", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      materials: [{
        materialId: "mat-1",
        courseId: "course-1",
        userId: "user-1",
        fileName: "serverless.pdf",
        s3Key: "user-1/course-1/mat-1-serverless.pdf",
        contentType: "application/pdf",
        status: "processing",
        createdAt: "2026-05-20T10:00:00.000Z"
      }]
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const materials = await listCourseMaterials("id-token-1", "course-1");

    expect(materials[0].status).toBe("processing");
    expect(fetchMock).toHaveBeenCalledWith("/courses/course-1/materials", expect.objectContaining({ method: "GET" }));
  });

  it("generates a study plan for a course", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      plan: {
        planId: "plan-1",
        courseId: "course-1",
        userId: "user-1",
        generatedFromMaterialIds: ["mat-1"],
        startDate: "2026-05-20",
        examDate: "2026-06-10",
        createdAt: "2026-05-20T10:00:00.000Z"
      },
      tasks: [{
        taskId: "task-1",
        planId: "plan-1",
        courseId: "course-1",
        userId: "user-1",
        date: "2026-05-20",
        title: "Review SQS",
        description: "Review queue basics.",
        estimatedMinutes: 30,
        status: "todo"
      }]
    }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateStudyPlan("id-token-1", "course-1");

    expect(result.tasks[0].title).toBe("Review SQS");
    expect(fetchMock).toHaveBeenCalledWith("/study-plans", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ courseId: "course-1" })
    }));
  });

  it("lists study tasks for a course", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      tasks: [{
        taskId: "task-1",
        planId: "plan-1",
        courseId: "course-1",
        userId: "user-1",
        date: "2026-05-20",
        title: "Review SQS",
        description: "Review queue basics.",
        estimatedMinutes: 30,
        status: "todo"
      }]
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const tasks = await listCourseTasks("id-token-1", "course-1");

    expect(tasks[0].title).toBe("Review SQS");
    expect(fetchMock).toHaveBeenCalledWith("/courses/course-1/tasks", expect.objectContaining({ method: "GET" }));
  });

  it("updates a study task status", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ taskId: "task-1", status: "done" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await updateStudyTaskStatus("id-token-1", "task-1", "done");

    expect(fetchMock).toHaveBeenCalledWith("/study-tasks/task-1", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ status: "done" })
    }));
  });

  it("creates a course", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      courseId: "course-1",
      userId: "user-1",
      name: "Cloud Computing",
      examDate: "2026-06-10",
      difficulty: "medium",
      weeklyHoursAvailable: 10,
      createdAt: "2026-05-21T00:00:00.000Z",
      updatedAt: "2026-05-21T00:00:00.000Z"
    }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const course = await createCourse("id-token-1", {
      name: "Cloud Computing",
      examDate: "2026-06-10",
      difficulty: "medium",
      weeklyHoursAvailable: 10
    });

    expect(course.name).toBe("Cloud Computing");
    expect(fetchMock).toHaveBeenCalledWith("/courses", expect.objectContaining({ method: "POST" }));
  });

  it("triggers reminders for the authenticated user", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ sent: 3 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runReminders("id-token-1");

    expect(result.sent).toBe(3);
    expect(fetchMock).toHaveBeenCalledWith("/reminders/run", expect.objectContaining({ method: "POST" }));
  });
});
