import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { nanoid } from "nanoid";
import { createMaterial } from "../services/materialRepository.js";
import { createUploadUrl } from "../services/uploadService.js";
import { getUserId } from "./auth.js";
import { json, problem } from "./response.js";

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  try {
    const body = parseUploadInput(JSON.parse(event.body ?? "{}"));
    const userId = getUserId(event);
    const materialId = nanoid();
    const s3Key = `${userId}/${body.courseId}/${materialId}-${sanitizeFileName(body.fileName)}`;
    const now = new Date().toISOString();
    const material = await createMaterial(required("MATERIALS_TABLE"), {
      materialId,
      courseId: body.courseId,
      userId,
      fileName: body.fileName,
      s3Key,
      contentType: body.contentType,
      status: "uploaded",
      createdAt: now
    });
    const uploadUrl = await createUploadUrl({
      bucket: required("MATERIALS_BUCKET"),
      key: s3Key,
      contentType: body.contentType
    });
    return json(201, { material, uploadUrl });
  } catch (error) {
    return problem(400, error instanceof Error ? error.message : "invalid request");
  }
}

interface CreateMaterialUploadInput {
  courseId: string;
  fileName: string;
  contentType: string;
}

function parseUploadInput(input: unknown): CreateMaterialUploadInput {
  if (!input || typeof input !== "object") throw new Error("request body must be an object");
  const body = input as Record<string, unknown>;
  if (typeof body.courseId !== "string" || body.courseId.length === 0) throw new Error("courseId is required");
  if (typeof body.fileName !== "string" || body.fileName.length === 0) throw new Error("fileName is required");
  if (typeof body.contentType !== "string" || !isSupportedContentType(body.contentType)) {
    throw new Error("contentType must be PDF, text, or markdown");
  }
  return {
    courseId: body.courseId,
    fileName: body.fileName,
    contentType: body.contentType
  };
}

function isSupportedContentType(contentType: string): boolean {
  return ["application/pdf", "text/plain", "text/markdown"].includes(contentType);
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
