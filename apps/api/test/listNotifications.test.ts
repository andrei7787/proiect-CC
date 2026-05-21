import { describe, expect, it, vi } from "vitest";
import { handler } from "../src/http/listNotifications";
import { listNotificationsForUser } from "../src/services/reminderRepository";

vi.mock("../src/services/reminderRepository", () => ({
  listNotificationsForUser: vi.fn(async () => [{
    notificationId: "notification-1",
    userId: "user-1",
    taskId: "task-1",
    type: "study-task",
    message: "Reminder: Review Lambda is due today",
    status: "created",
    createdAt: "2026-05-20T10:00:00.000Z"
  }])
}));

const event = {
  requestContext: {
    authorizer: { jwt: { claims: { sub: "user-1" } } }
  }
} as any;

describe("listNotifications handler", () => {
  it("lists notifications for the authenticated user", async () => {
    process.env.NOTIFICATIONS_TABLE = "Notifications";

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      notifications: [{
        notificationId: "notification-1",
        userId: "user-1",
        taskId: "task-1",
        type: "study-task",
        message: "Reminder: Review Lambda is due today",
        status: "created",
        createdAt: "2026-05-20T10:00:00.000Z"
      }]
    });
    expect(listNotificationsForUser).toHaveBeenCalledWith("Notifications", "user-1");
  });
});
