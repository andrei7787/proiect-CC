import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Course, Material, StudyPlan, StudyTask, StudyTaskStatus } from "@ai-study-planner/shared";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function getCourse(tableName: string, courseId: string): Promise<Course | undefined> {
  const result = await client.send(new GetCommand({ TableName: tableName, Key: { courseId } }));
  return result.Item as Course | undefined;
}

export async function listReadyMaterials(tableName: string, courseId: string, userId: string): Promise<Material[]> {
  const result = await client.send(new QueryCommand({
    TableName: tableName,
    IndexName: "byCourse",
    KeyConditionExpression: "courseId = :courseId",
    FilterExpression: "userId = :userId AND #status = :status",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":courseId": courseId,
      ":userId": userId,
      ":status": "ready"
    }
  }));
  return (result.Items ?? []) as Material[];
}

export async function createStudyPlanWithTasks(input: {
  plansTable: string;
  tasksTable: string;
  plan: StudyPlan;
  tasks: StudyTask[];
}): Promise<{ plan: StudyPlan; tasks: StudyTask[] }> {
  await client.send(new TransactWriteCommand({
    TransactItems: [
      { Put: { TableName: input.plansTable, Item: input.plan } },
      ...input.tasks.map((task) => ({ Put: { TableName: input.tasksTable, Item: task } }))
    ]
  }));
  return { plan: input.plan, tasks: input.tasks };
}

export async function listStudyTasksForCourse(tableName: string, courseId: string, userId: string): Promise<StudyTask[]> {
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
  return (result.Items ?? []) as StudyTask[];
}

export async function getStudyTask(tableName: string, taskId: string): Promise<StudyTask | undefined> {
  const result = await client.send(new GetCommand({ TableName: tableName, Key: { taskId } }));
  return result.Item as StudyTask | undefined;
}

export async function updateStudyTaskStatus(
  tableName: string,
  taskId: string,
  status: StudyTaskStatus
): Promise<Partial<StudyTask>> {
  await client.send(new UpdateCommand({
    TableName: tableName,
    Key: { taskId },
    UpdateExpression: "SET #status = :status",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: { ":status": status }
  }));
  return { taskId, status };
}
