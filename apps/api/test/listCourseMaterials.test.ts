import { describe, expect, it, vi } from "vitest";
import { handler } from "../src/http/listCourseMaterials";
import { listMaterialsForCourse } from "../src/services/materialRepository";

vi.mock("../src/services/materialRepository", () => ({
  listMaterialsForCourse: vi.fn(async () => [{
    materialId: "mat-1",
    courseId: "course-1",
    userId: "user-1",
    fileName: "serverless.pdf",
    s3Key: "user-1/course-1/mat-1-serverless.pdf",
    contentType: "application/pdf",
    status: "ready",
    summary: "Serverless systems use managed event-driven compute.",
    keyConcepts: ["Lambda", "SQS"],
    createdAt: "2026-05-20T10:00:00.000Z",
    processedAt: "2026-05-20T10:01:00.000Z"
  }])
}));

const event = {
  pathParameters: { courseId: "course-1" },
  requestContext: {
    authorizer: { jwt: { claims: { sub: "user-1" } } }
  }
} as any;

describe("listCourseMaterials handler", () => {
  it("lists materials for the authenticated user's course", async () => {
    process.env.MATERIALS_TABLE = "Materials";

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      materials: [{
        materialId: "mat-1",
        courseId: "course-1",
        userId: "user-1",
        fileName: "serverless.pdf",
        s3Key: "user-1/course-1/mat-1-serverless.pdf",
        contentType: "application/pdf",
        status: "ready",
        summary: "Serverless systems use managed event-driven compute.",
        keyConcepts: ["Lambda", "SQS"],
        createdAt: "2026-05-20T10:00:00.000Z",
        processedAt: "2026-05-20T10:01:00.000Z"
      }]
    });
    expect(listMaterialsForCourse).toHaveBeenCalledWith("Materials", "course-1", "user-1");
  });
});
