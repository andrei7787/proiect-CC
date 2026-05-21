import { describe, expect, it, vi } from "vitest";
import { processMaterialRecord } from "../src/async/processMaterial";

const awsSend = vi.hoisted(() => vi.fn(async (command: { constructor: { name: string } }) => {
  if (command.constructor.name === "GetObjectCommand") {
    return {
      Body: {
        transformToByteArray: async () => new Uint8Array([1, 2, 3])
      }
    };
  }
  return { SecretString: "gemini-key" };
}));

vi.mock("@aws-sdk/client-s3", () => ({
  GetObjectCommand: vi.fn(function GetObjectCommand(this: object) {}),
  S3Client: vi.fn(() => ({ send: awsSend }))
}));

vi.mock("@aws-sdk/client-secrets-manager", () => ({
  GetSecretValueCommand: vi.fn(function GetSecretValueCommand(this: object) {}),
  SecretsManagerClient: vi.fn(() => ({ send: awsSend }))
}));

vi.mock("../src/services/materialRepository", () => ({
  markMaterialProcessing: vi.fn(async () => undefined),
  markMaterialReady: vi.fn(async (_table, materialId, result) => ({ materialId, ...result })),
  markMaterialFailed: vi.fn(async () => undefined)
}));

vi.mock("../src/services/geminiClient", () => ({
  analyzeStudyMaterial: vi.fn(async () => ({
    summary: "Distributed systems coordinate independent services.",
    keyConcepts: ["scalability", "queues"]
  }))
}));

describe("processMaterialRecord", () => {
  it("marks material ready with Gemini analysis", async () => {
    process.env.MATERIALS_TABLE = "Materials";
    process.env.GEMINI_API_KEY_SECRET_ID = "GeminiSecret";
    const result = await processMaterialRecord({
      materialId: "mat-1",
      bucket: "materials",
      key: "user-1/mat-1.pdf",
      contentType: "application/pdf"
    });
    expect(result).toMatchObject({
      materialId: "mat-1",
      summary: "Distributed systems coordinate independent services.",
      keyConcepts: ["scalability", "queues"]
    });
  });
});
