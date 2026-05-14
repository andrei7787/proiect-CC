import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const mocks = vi.hoisted(() => ({
  loginWithCognito: vi.fn(),
  listCourses: vi.fn()
}));

vi.mock("./auth/cognito", () => ({ loginWithCognito: mocks.loginWithCognito }));
vi.mock("./api/client", () => ({ listCourses: mocks.listCourses }));

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.loginWithCognito.mockReset();
    mocks.listCourses.mockReset();
    mocks.listCourses.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it("shows login before a session exists", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Student login" })).toBeInTheDocument();
    expect(screen.queryByText("Today's tasks")).not.toBeInTheDocument();
  });

  it("signs in and loads the dashboard with the Cognito id token", async () => {
    mocks.loginWithCognito.mockResolvedValueOnce({
      idToken: "id-token-1",
      accessToken: "access-token-1",
      refreshToken: "refresh-token-1"
    });

    render(<App />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "student@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("AI Study Planner")).toBeInTheDocument();
    expect(localStorage.getItem("ai-study-planner.auth")).toContain("id-token-1");
  });

  it("logs out and clears the authenticated view", async () => {
    localStorage.setItem("ai-study-planner.auth", JSON.stringify({
      idToken: "id-token-1",
      accessToken: "access-token-1"
    }));

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));

    expect(screen.getByRole("heading", { name: "Student login" })).toBeInTheDocument();
    expect(localStorage.getItem("ai-study-planner.auth")).toBeNull();
  });

  it("renders courses returned by the protected API", async () => {
    localStorage.setItem("ai-study-planner.auth", JSON.stringify({
      idToken: "id-token-1",
      accessToken: "access-token-1"
    }));
    mocks.listCourses.mockResolvedValueOnce([{
      courseId: "course-1",
      userId: "user-1",
      name: "Distributed Systems",
      examDate: "2026-06-20",
      difficulty: "medium",
      weeklyHoursAvailable: 6,
      createdAt: "2026-05-14T00:00:00.000Z",
      updatedAt: "2026-05-14T00:00:00.000Z"
    }]);

    render(<App />);

    expect(await screen.findByText("Distributed Systems")).toBeInTheDocument();
    expect(screen.getByText("Exam: 2026-06-20")).toBeInTheDocument();
  });
});
