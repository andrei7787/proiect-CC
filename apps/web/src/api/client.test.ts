import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, listCourses } from "./client";

describe("apiRequest", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the provided token as a bearer authorization header", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => (
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    ));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/courses", { token: "id-token-1" });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0];
    if (!init) throw new Error("fetch init is required");
    const headers = init.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer id-token-1");
  });

  it("loads courses from the protected courses route", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      courses: [{
        courseId: "course-1",
        userId: "user-1",
        name: "Cloud Computing",
        examDate: "2026-06-10",
        difficulty: "hard",
        weeklyHoursAvailable: 8,
        createdAt: "2026-05-14T00:00:00.000Z",
        updatedAt: "2026-05-14T00:00:00.000Z"
      }]
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const courses = await listCourses("id-token-1");

    expect(courses).toHaveLength(1);
    expect(courses[0].name).toBe("Cloud Computing");
    expect(fetchMock).toHaveBeenCalledWith("/courses", expect.objectContaining({ method: "GET" }));
  });
});
