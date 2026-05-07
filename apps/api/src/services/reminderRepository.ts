import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { nanoid } from "nanoid";
import type { StudyTask } from "@ai-study-planner/shared";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export interface NotificationInput {
  userId: string;
  taskId: string;
  type: "study-task";
  message: string;
  status: "created" | "sent" | "failed";
}

export async function listDueTasks(tableName: string, today: string): Promise<StudyTask[]> {
  const result = await client.send(new QueryCommand({
    TableName: tableName,
    IndexName: "byDate",
    KeyConditionExpression: "#date = :today",
    FilterExpression: "#status = :status AND attribute_not_exists(reminderSentAt)",
    ExpressionAttributeNames: {
      "#date": "date",
      "#status": "status"
    },
    ExpressionAttributeValues: {
      ":today": today,
      ":status": "todo"
    }
  }));
  return (result.Items ?? []) as StudyTask[];
}

export async function createNotification(tableName: string, input: NotificationInput): Promise<void> {
  await client.send(new PutCommand({
    TableName: tableName,
    Item: {
      notificationId: nanoid(),
      ...input,
      createdAt: new Date().toISOString()
    }
  }));
}

export async function markReminderSent(tableName: string, taskId: string, sentAt: string): Promise<void> {
  await client.send(new UpdateCommand({
    TableName: tableName,
    Key: { taskId },
    UpdateExpression: "SET reminderSentAt = :sentAt",
    ExpressionAttributeValues: { ":sentAt": sentAt }
  }));
}
