import type { SQSEvent } from "aws-lambda";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { analyzeStudyMaterial } from "../services/geminiClient.js";
import { markMaterialFailed, markMaterialProcessing, markMaterialReady } from "../services/materialRepository.js";

const s3 = new S3Client({});
const secrets = new SecretsManagerClient({});

export async function handler(event: SQSEvent) {
  for (const record of event.Records) {
    const body = JSON.parse(record.body);
    const records = Array.isArray(body.Records) ? body.Records.map(parseS3Record) : [body];
    for (const materialRecord of records) {
      await processMaterialRecord(materialRecord);
    }
  }
}

export async function processMaterialRecord(input: {
  materialId: string;
  bucket: string;
  key: string;
  contentType: string;
}) {
  const tableName = required("MATERIALS_TABLE");
  try {
    await markMaterialProcessing(tableName, input.materialId);
    const object = await s3.send(new GetObjectCommand({ Bucket: input.bucket, Key: input.key }));
    const fileBytes = await object.Body!.transformToByteArray();
    const analysis = await analyzeStudyMaterial({
      fileBytes,
      contentType: input.contentType,
      fileName: input.key.split("/").at(-1) ?? "material",
      apiKey: await getGeminiApiKey()
    });
    return await markMaterialReady(tableName, input.materialId, analysis);
  } catch (error) {
    await markMaterialFailed(tableName, input.materialId, error instanceof Error ? error.message : "processing failed");
    throw error;
  }
}

async function getGeminiApiKey(): Promise<string> {
  const secret = await secrets.send(new GetSecretValueCommand({ SecretId: required("GEMINI_API_KEY_SECRET_ID") }));
  if (!secret.SecretString) throw new Error("Gemini secret is empty");
  return secret.SecretString;
}

function parseS3Record(record: {
  s3: { bucket: { name: string }; object: { key: string } };
}): { materialId: string; bucket: string; key: string; contentType: string } {
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
  const fileSegment = key.split("/").at(-1) ?? "";
  const materialId = fileSegment.split("-")[0];
  return {
    materialId,
    bucket: record.s3.bucket.name,
    key,
    contentType: contentTypeFromKey(key)
  };
}

function contentTypeFromKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".md")) return "text/markdown";
  return "text/plain";
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
