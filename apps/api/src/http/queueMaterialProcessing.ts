import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getMaterial } from "../services/materialRepository.js";
import { enqueueMaterialProcessing } from "../services/materialQueuePublisher.js";
import { getUserId } from "./auth.js";
import { json, problem } from "./response.js";

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  try {
    const materialId = event.pathParameters?.materialId;
    if (!materialId) throw new Error("materialId is required");

    const material = await getMaterial(required("MATERIALS_TABLE"), materialId);
    if (!material || material.userId !== getUserId(event)) throw new Error("material not found");
    if (material.status !== "uploaded" && material.status !== "failed") {
      throw new Error("material is not ready to be queued");
    }

    await enqueueMaterialProcessing({
      queueUrl: required("MATERIAL_QUEUE_URL"),
      materialId: material.materialId,
      bucket: required("MATERIALS_BUCKET"),
      key: material.s3Key,
      contentType: material.contentType
    });
    return json(202, { queued: true, materialId: material.materialId });
  } catch (error) {
    return problem(400, error instanceof Error ? error.message : "invalid request");
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
