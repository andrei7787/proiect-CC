import { describe, expect, it, vi } from "vitest";
import { handler } from "../src/http/runReminders";
import { sendDueReminders } from "../src/async/sendReminders";

vi.mock("../src/async/sendReminders", () => ({
  sendDueReminders: vi.fn(async () => 2)
}));

const event = {
  requestContext: {
    authorizer: { jwt: { claims: { sub: "user-1" } } }
  }
} as any;

describe("runReminders handler", () => {
  it("runs due reminders for the authenticated user", async () => {
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ sent: 2 });
    expect(sendDueReminders).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), "user-1");
  });
});
