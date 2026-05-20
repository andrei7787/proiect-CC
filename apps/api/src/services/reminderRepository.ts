import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { nanoid } from "nanoid";
import type { Notification, StudyTask } from "@ai-study-planner/shared";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export interface NotificationInput {
  userId: string;
  taskId: string;
  type: "study-task";
  message: string;
  status: "created" | "sent" | "failed";
}

export async function listDueTasks(tableName: string, today: string, userId?: string): Promise<StudyTask[]> {
  const filterParts = ["#status = :status", "attribute_not_exists(reminderSentAt)"];
  const expressionAttributeValues: Record<string, string> = {
    ":today": today,
    ":status": "todo"
  };
  if (userId) {
    filterParts.push("userId = :userId");
    expressionAttributeValues[":userId"] = userId;
  }

  const result = await client.send(new QueryCommand({
    TableName: tableName,
    IndexName: "byDate",
    KeyConditionExpression: "#date = :today",
    FilterExpression: filterParts.join(" AND "),
    ExpressionAttributeNames: {
      "#date": "date",
      "#status": "status"
    },
    ExpressionAttributeValues: expressionAttributeValues
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

export async function listNotificationsForUser(tableName: string, userId: string): Promise<Notification[]> {
  const result = await client.send(new QueryCommand({
    TableName: tableName,
    IndexName: "byUser",
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: { ":userId": userId }
  }));
  return (result.Items ?? []) as Notification[];
}

export async function markReminderSent(tableName: string, taskId: string, sentAt: string): Promise<void> {
  await client.send(new UpdateCommand({
    TableName: tableName,
    Key: { taskId },
    UpdateExpression: "SET reminderSentAt = :sentAt",
    ExpressionAttributeValues: { ":sentAt": sentAt }
  }));
}
