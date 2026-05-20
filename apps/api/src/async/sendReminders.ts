import { createNotification, listDueTasks, markReminderSent } from "../services/reminderRepository.js";
import { publishReminderNotification } from "../services/notificationPublisher.js";

export async function handler() {
  await sendDueReminders(new Date().toISOString().slice(0, 10));
}

export async function sendDueReminders(today: string, userId?: string): Promise<number> {
  const tasks = await listDueTasks(required("TASKS_TABLE"), today, userId);
  for (const task of tasks) {
    const message = `Reminder: ${task.title} is due today`;
    await createNotification(required("NOTIFICATIONS_TABLE"), {
      userId: task.userId,
      taskId: task.taskId,
      type: "study-task",
      message,
      status: "created"
    });
    await publishReminderNotification({
      topicArn: required("REMINDER_TOPIC_ARN"),
      subject: `Study reminder: ${task.title}`,
      message
    });
    await markReminderSent(required("TASKS_TABLE"), task.taskId, new Date().toISOString());
  }
  return tasks.length;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
