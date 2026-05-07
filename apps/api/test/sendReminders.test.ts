import { describe, expect, it, vi } from "vitest";
import { sendDueReminders } from "../src/async/sendReminders";

vi.mock("../src/services/reminderRepository", () => ({
  listDueTasks: vi.fn(async () => [{ taskId: "task-1", userId: "user-1", title: "Study SQS", date: "2026-06-01" }]),
  createNotification: vi.fn(async () => undefined),
  markReminderSent: vi.fn(async () => undefined)
}));

vi.mock("../src/services/emailService", () => ({
  sendReminderEmail: vi.fn(async () => undefined)
}));

describe("sendDueReminders", () => {
  it("sends reminders for due tasks", async () => {
    process.env.TASKS_TABLE = "Tasks";
    process.env.NOTIFICATIONS_TABLE = "Notifications";
    await expect(sendDueReminders("2026-06-01")).resolves.toBe(1);
  });
});
