import { describe, expect, it, vi } from "vitest";
import { sendDueReminders } from "../src/async/sendReminders";
import { publishReminderNotification } from "../src/services/notificationPublisher";
import { listDueTasks } from "../src/services/reminderRepository";

vi.mock("../src/services/reminderRepository", () => ({
  listDueTasks: vi.fn(async () => [{ taskId: "task-1", userId: "user-1", title: "Study SQS", date: "2026-06-01" }]),
  createNotification: vi.fn(async () => undefined),
  markReminderSent: vi.fn(async () => undefined)
}));

vi.mock("../src/services/notificationPublisher", () => ({
  publishReminderNotification: vi.fn(async () => undefined)
}));

describe("sendDueReminders", () => {
  it("sends reminders for due tasks", async () => {
    process.env.TASKS_TABLE = "Tasks";
    process.env.NOTIFICATIONS_TABLE = "Notifications";
    process.env.REMINDER_TOPIC_ARN = "arn:aws:sns:us-east-1:123456789012:AiStudyPlannerReminders";
    await expect(sendDueReminders("2026-06-01")).resolves.toBe(1);
    expect(publishReminderNotification).toHaveBeenCalledWith({
      topicArn: "arn:aws:sns:us-east-1:123456789012:AiStudyPlannerReminders",
      subject: "Study reminder: Study SQS",
      message: "Reminder: Study SQS is due today"
    });
  });

  it("can scope due reminders to a single user", async () => {
    process.env.TASKS_TABLE = "Tasks";
    process.env.NOTIFICATIONS_TABLE = "Notifications";
    process.env.REMINDER_TOPIC_ARN = "arn:aws:sns:us-east-1:123456789012:AiStudyPlannerReminders";

    await sendDueReminders("2026-06-01", "user-1");

    expect(listDueTasks).toHaveBeenCalledWith("Tasks", "2026-06-01", "user-1");
  });
});
