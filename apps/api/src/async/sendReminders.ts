import { createNotification, listDueTasks, markReminderSent } from "../services/reminderRepository.js";
import { sendReminderEmail } from "../services/emailService.js";

export async function handler() {
  await sendDueReminders(new Date().toISOString().slice(0, 10));
}

export async function sendDueReminders(today: string): Promise<number> {
  const tasks = await listDueTasks(required("TASKS_TABLE"), today);
  for (const task of tasks) {
    await createNotification(required("NOTIFICATIONS_TABLE"), {
      userId: task.userId,
      taskId: task.taskId,
      type: "study-task",
      message: `Reminder: ${task.title} is due today`,
      status: "created"
    });
    await sendReminderEmail(task.userId, `Study reminder: ${task.title}`);
    await markReminderSent(required("TASKS_TABLE"), task.taskId, new Date().toISOString());
  }
  return tasks.length;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
