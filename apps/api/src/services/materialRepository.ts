import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Material } from "@ai-study-planner/shared";
import type { GeminiMaterialResult } from "./geminiClient.js";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function createMaterial(tableName: string, material: Material): Promise<Material> {
  await client.send(new PutCommand({ TableName: tableName, Item: material }));
  return material;
}

export async function getMaterial(tableName: string, materialId: string): Promise<Material | undefined> {
  const result = await client.send(new GetCommand({ TableName: tableName, Key: { materialId } }));
  return result.Item as Material | undefined;
}

export async function listMaterialsForCourse(tableName: string, courseId: string, userId: string): Promise<Material[]> {
  const result = await client.send(new QueryCommand({
    TableName: tableName,
    IndexName: "byCourse",
    KeyConditionExpression: "courseId = :courseId",
    FilterExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":courseId": courseId,
      ":userId": userId
    }
  }));
  return (result.Items ?? []) as Material[];
}

export async function listMaterialsForUser(tableName: string, userId: string): Promise<Material[]> {
  const result = await client.send(new QueryCommand({
    TableName: tableName,
    IndexName: "byUser",
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: { ":userId": userId }
  }));
  return (result.Items ?? []) as Material[];
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
    UpdateExpression: "SET #status = :status, summary = :summary, keyConcepts = :keyConcepts, processedAt = :processedAt REMOVE errorMessage",
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
