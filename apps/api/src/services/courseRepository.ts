import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { Course } from "@ai-study-planner/shared";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function createCourse(tableName: string, course: Course): Promise<Course> {
  await client.send(new PutCommand({ TableName: tableName, Item: course }));
  return course;
}

export async function listCoursesByUser(tableName: string, userId: string): Promise<Course[]> {
  const result = await client.send(new QueryCommand({
    TableName: tableName,
    IndexName: "byUser",
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: { ":userId": userId }
  }));
  return (result.Items ?? []) as Course[];
}
