import { describe, expect, it, vi } from "vitest";
import { handler } from "../src/http/queueMaterialProcessing";
import { getMaterial } from "../src/services/materialRepository";
import { enqueueMaterialProcessing } from "../src/services/materialQueuePublisher";

vi.mock("../src/services/materialRepository", () => ({
  getMaterial: vi.fn(async () => ({
    materialId: "mat-1",
    courseId: "course-1",
    userId: "user-1",
    fileName: "serverless.pdf",
    s3Key: "user-1/course-1/mat-1-serverless.pdf",
    contentType: "application/pdf",
    status: "uploaded",
    createdAt: "2026-05-20T10:00:00.000Z"
  }))
}));

vi.mock("../src/services/materialQueuePublisher", () => ({
  enqueueMaterialProcessing: vi.fn(async () => undefined)
}));

const event = {
  pathParameters: { materialId: "mat-1" },
  requestContext: {
    authorizer: { jwt: { claims: { sub: "user-1" } } }
  }
} as any;

describe("queueMaterialProcessing handler", () => {
  it("queues processing for an uploaded material owned by the authenticated user", async () => {
    process.env.MATERIALS_TABLE = "Materials";
    process.env.MATERIALS_BUCKET = "materials-bucket";
    process.env.MATERIAL_QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123/materials";

    const response = await handler(event);

    expect(response.statusCode).toBe(202);
    expect(JSON.parse(response.body)).toEqual({ queued: true, materialId: "mat-1" });
    expect(getMaterial).toHaveBeenCalledWith("Materials", "mat-1");
    expect(enqueueMaterialProcessing).toHaveBeenCalledWith({
      queueUrl: "https://sqs.us-east-1.amazonaws.com/123/materials",
      materialId: "mat-1",
      bucket: "materials-bucket",
      key: "user-1/course-1/mat-1-serverless.pdf",
      contentType: "application/pdf"
    });
  });

  it("rejects materials owned by another user", async () => {
    vi.mocked(getMaterial).mockResolvedValueOnce({
      materialId: "mat-2",
      courseId: "course-1",
      userId: "user-2",
      fileName: "serverless.pdf",
      s3Key: "user-2/course-1/mat-2-serverless.pdf",
      contentType: "application/pdf",
      status: "uploaded",
      createdAt: "2026-05-20T10:00:00.000Z"
    });
    process.env.MATERIALS_TABLE = "Materials";
    process.env.MATERIALS_BUCKET = "materials-bucket";
    process.env.MATERIAL_QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123/materials";

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: "material not found" });
  });
});
