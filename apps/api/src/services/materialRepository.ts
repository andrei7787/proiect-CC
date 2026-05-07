import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Material } from "@ai-study-planner/shared";
import type { GeminiMaterialResult } from "./geminiClient.js";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function createMaterial(tableName: string, material: Material): Promise<Material> {
  await client.send(new PutCommand({ TableName: tableName, Item: material }));
  return material;
}

export async function markMaterialProcessing(tableName: string, materialId: string): Promise<void> {
  await client.send(new UpdateCommand({
    TableName: tableName,
    Key: { materialId },
    UpdateExpression: "SET #status = :status",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: { ":status": "processing" }
  }));
}

export async function markMaterialReady(
  tableName: string,
  materialId: string,
  result: GeminiMaterialResult
): Promise<Partial<Material>> {
  const processedAt = new Date().toISOString();
  await client.send(new UpdateCommand({
    TableName: tableName,
    Key: { materialId },
    UpdateExpression: [
      "SET #status = :status",
      "summary = :summary",
      "keyConcepts = :keyConcepts",
      "processedAt = :processedAt",
      "REMOVE errorMessage"
    ].join(" "),
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":status": "ready",
      ":summary": result.summary,
      ":keyConcepts": result.keyConcepts,
      ":processedAt": processedAt
    }
  }));
  return { materialId, status: "ready", summary: result.summary, keyConcepts: result.keyConcepts, processedAt };
}

export async function markMaterialFailed(tableName: string, materialId: string, errorMessage: string): Promise<void> {
  await client.send(new UpdateCommand({
    TableName: tableName,
    Key: { materialId },
    UpdateExpression: "SET #status = :status, errorMessage = :errorMessage",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":status": "failed",
      ":errorMessage": errorMessage
    }
  }));
}
