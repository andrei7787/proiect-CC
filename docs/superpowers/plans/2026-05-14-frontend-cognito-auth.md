# Frontend Cognito Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the React frontend sign in through Cognito, keep the returned JWT session, and call `GET /courses` with the real bearer token.

**Architecture:** Add a focused Cognito auth module under `apps/web/src/auth`, keep API transport in `apps/web/src/api/client.ts`, and pass the authenticated `idToken` from `App` into UI pages that call protected API routes. Persist the session in `localStorage` for demo reloads and keep token refresh out of this first slice.

**Tech Stack:** React 19, Vite, Vitest/jsdom, AWS SDK Cognito Identity Provider client, existing API Gateway JWT authorizer.

---

## File Structure

- Create `apps/web/src/auth/cognito.ts`: reads Vite Cognito config, calls `InitiateAuthCommand`, normalizes auth errors, and stores session data.
- Create `apps/web/src/auth/session.ts`: owns `localStorage` read/write/clear for session persistence.
- Modify `apps/web/src/api/client.ts`: keep current `apiRequest` contract and add a typed `listCourses(token)` helper.
- Modify `apps/web/src/App.tsx`: initialize session from storage, gate app content behind login, pass token into dashboard, and expose logout.
- Modify `apps/web/src/pages/Login.tsx`: make the form controlled and call an injected async `onLogin`.
- Modify `apps/web/src/pages/Dashboard.tsx`: load courses with the real token and render loading/error/empty/data states.
- Modify `apps/web/src/App.test.tsx`: cover login gating and authenticated dashboard behavior.
- Create `apps/web/src/api/client.test.ts`: cover authorization header and `listCourses`.
- Create `apps/web/src/auth/session.test.ts`: cover session persistence.
- Modify `apps/web/package.json` and `package-lock.json`: add `@aws-sdk/client-cognito-identity-provider`.

---

### Task 1: API Client Token Plumbing

**Files:**
- Modify: `apps/web/src/api/client.ts`
- Create: `apps/web/src/api/client.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/api/client.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, listCourses } from "./client";

describe("apiRequest", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the provided token as a bearer authorization header", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/courses", { token: "id-token-1" });

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/api/client.test.ts --environment jsdom`

Expected: FAIL because `listCourses` is not exported from `apps/web/src/api/client.ts`.

- [ ] **Step 3: Write minimal implementation**

Update `apps/web/src/api/client.ts`:

```ts
import type { Course } from "@ai-study-planner/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export interface ApiClientOptions {
  token?: string;
}

interface ListCoursesResponse {
  courses: Course[];
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & ApiClientOptions = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("content-type", "application/json");
  if (options.token) headers.set("authorization", `Bearer ${options.token}`);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers
  });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function listCourses(token: string): Promise<Course[]> {
  const response = await apiRequest<ListCoursesResponse>("/courses", {
    method: "GET",
    token
  });
  return response.courses;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/src/api/client.test.ts --environment jsdom`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add apps/web/src/api/client.ts apps/web/src/api/client.test.ts
git commit -m "feat: add authenticated courses api client"
```

---

### Task 2: Session Persistence

**Files:**
- Create: `apps/web/src/auth/session.ts`
- Create: `apps/web/src/auth/session.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/auth/session.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { clearStoredSession, loadStoredSession, saveStoredSession, type AuthSession } from "./session";

const session: AuthSession = {
  idToken: "id-token-1",
  accessToken: "access-token-1",
  refreshToken: "refresh-token-1"
};

describe("session storage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("saves and loads a valid auth session", () => {
    saveStoredSession(session);

    expect(loadStoredSession()).toEqual(session);
  });

  it("returns null when stored data is malformed", () => {
    localStorage.setItem("ai-study-planner.auth", JSON.stringify({ idToken: "" }));

    expect(loadStoredSession()).toBeNull();
  });

  it("clears the stored session", () => {
    saveStoredSession(session);

    clearStoredSession();

    expect(loadStoredSession()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/auth/session.test.ts --environment jsdom`

Expected: FAIL because `apps/web/src/auth/session.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/src/auth/session.ts`:

```ts
export interface AuthSession {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
}

const storageKey = "ai-study-planner.auth";

export function loadStoredSession(): AuthSession | null {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as Partial<AuthSession>;
    if (typeof parsed.idToken !== "string" || parsed.idToken.length === 0) return null;
    if (typeof parsed.accessToken !== "string" || parsed.accessToken.length === 0) return null;
    if (parsed.refreshToken !== undefined && typeof parsed.refreshToken !== "string") return null;
    return {
      idToken: parsed.idToken,
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken
    };
  } catch {
    return null;
  }
}

export function saveStoredSession(session: AuthSession): void {
  localStorage.setItem(storageKey, JSON.stringify(session));
}

export function clearStoredSession(): void {
  localStorage.removeItem(storageKey);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/src/auth/session.test.ts --environment jsdom`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add apps/web/src/auth/session.ts apps/web/src/auth/session.test.ts
git commit -m "feat: persist frontend auth session"
```

---

### Task 3: Cognito Login Module

**Files:**
- Create: `apps/web/src/auth/cognito.ts`
- Modify: `apps/web/package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install Cognito browser SDK**

Run: `npm install @aws-sdk/client-cognito-identity-provider --workspace apps/web`

Expected: `apps/web/package.json` and `package-lock.json` include `@aws-sdk/client-cognito-identity-provider`.

- [ ] **Step 2: Write the failing tests**

Create `apps/web/src/auth/cognito.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginWithCognito } from "./cognito";

const send = vi.fn();

vi.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  AuthFlowType: { USER_PASSWORD_AUTH: "USER_PASSWORD_AUTH" },
  CognitoIdentityProviderClient: vi.fn(() => ({ send })),
  InitiateAuthCommand: vi.fn((input) => ({ input }))
}));

describe("loginWithCognito", () => {
  beforeEach(() => {
    send.mockReset();
  });

  it("returns Cognito tokens for valid credentials", async () => {
    send.mockResolvedValueOnce({
      AuthenticationResult: {
        IdToken: "id-token-1",
        AccessToken: "access-token-1",
        RefreshToken: "refresh-token-1"
      }
    });

    const session = await loginWithCognito("student@example.com", "Password123!");

    expect(session).toEqual({
      idToken: "id-token-1",
      accessToken: "access-token-1",
      refreshToken: "refresh-token-1"
    });
  });

  it("throws a friendly error when Cognito does not return tokens", async () => {
    send.mockResolvedValueOnce({ AuthenticationResult: {} });

    await expect(loginWithCognito("student@example.com", "Password123!"))
      .rejects.toThrow("Sign in did not return a valid session.");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run apps/web/src/auth/cognito.test.ts --environment jsdom`

Expected: FAIL because `apps/web/src/auth/cognito.ts` does not exist.

- [ ] **Step 4: Write minimal implementation**

Create `apps/web/src/auth/cognito.ts`:

```ts
import {
  AuthFlowType,
  CognitoIdentityProviderClient,
  InitiateAuthCommand
} from "@aws-sdk/client-cognito-identity-provider";
import type { AuthSession } from "./session";

function requiredEnv(name: string): string {
  const value = import.meta.env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export async function loginWithCognito(email: string, password: string): Promise<AuthSession> {
  const client = new CognitoIdentityProviderClient({
    region: requiredEnv("VITE_AWS_REGION")
  });

  const result = await client.send(new InitiateAuthCommand({
    AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
    ClientId: requiredEnv("VITE_COGNITO_CLIENT_ID"),
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password
    }
  }));

  const auth = result.AuthenticationResult;
  if (!auth?.IdToken || !auth.AccessToken) {
    throw new Error("Sign in did not return a valid session.");
  }

  return {
    idToken: auth.IdToken,
    accessToken: auth.AccessToken,
    refreshToken: auth.RefreshToken
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run apps/web/src/auth/cognito.test.ts --environment jsdom`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add apps/web/package.json package-lock.json apps/web/src/auth/cognito.ts apps/web/src/auth/cognito.test.ts
git commit -m "feat: add cognito login client"
```

---

### Task 4: Login Page and App Session Flow

**Files:**
- Modify: `apps/web/src/pages/Login.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.test.tsx`

- [ ] **Step 1: Write the failing tests**

Replace `apps/web/src/App.test.tsx` with:

```tsx
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const loginWithCognito = vi.fn();
const listCourses = vi.fn();

vi.mock("./auth/cognito", () => ({ loginWithCognito }));
vi.mock("./api/client", () => ({ listCourses }));

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    loginWithCognito.mockReset();
    listCourses.mockReset();
    listCourses.mockResolvedValue([]);
  });

  it("shows login before a session exists", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Student login" })).toBeInTheDocument();
    expect(screen.queryByText("Today's tasks")).not.toBeInTheDocument();
  });

  it("signs in and loads the dashboard with the Cognito id token", async () => {
    loginWithCognito.mockResolvedValueOnce({
      idToken: "id-token-1",
      accessToken: "access-token-1",
      refreshToken: "refresh-token-1"
    });

    render(<App />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "student@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(listCourses).toHaveBeenCalledWith("id-token-1"));
    expect(screen.getByText("No courses yet.")).toBeInTheDocument();
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/App.test.tsx --environment jsdom`

Expected: FAIL because `App` starts on the dashboard and `Login` does not submit credentials.

- [ ] **Step 3: Write minimal implementation**

Update `apps/web/src/pages/Login.tsx`:

```tsx
import { type FormEvent, useState } from "react";

interface LoginProps {
  error?: string;
  isSubmitting?: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
}

export function Login({ error, isSubmitting = false, onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onLogin(email, password);
  }

  return (
    <form className="panel login-panel" onSubmit={handleSubmit}>
      <h2>Student login</h2>
      <label>
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Continue"}
      </button>
    </form>
  );
}
```

Update `apps/web/src/App.tsx`:

```tsx
import { useState } from "react";
import { loginWithCognito } from "./auth/cognito";
import {
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
  type AuthSession
} from "./auth/session";
import { CourseDetail } from "./pages/CourseDetail";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";

type View = "dashboard" | "course";

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() => loadStoredSession());
  const [view, setView] = useState<View>("dashboard");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  async function handleLogin(email: string, password: string) {
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const nextSession = await loginWithCognito(email, password);
      saveStoredSession(nextSession);
      setSession(nextSession);
      setView("dashboard");
    } catch {
      setLoginError("Sign in failed. Check your email and password.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handleLogout() {
    clearStoredSession();
    setSession(null);
  }

  if (!session) {
    return (
      <main className="app-shell">
        <section className="content">
          <Login error={loginError} isSubmitting={isLoggingIn} onLogin={handleLogin} />
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <h1>AI Study Planner</h1>
        <nav aria-label="Primary">
          <button type="button" onClick={() => setView("dashboard")}>Dashboard</button>
          <button type="button" onClick={() => setView("course")}>Course</button>
          <button type="button" onClick={handleLogout}>Logout</button>
        </nav>
      </aside>
      <section className="content">
        {view === "dashboard" && <Dashboard token={session.idToken} />}
        {view === "course" && <CourseDetail />}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/src/App.test.tsx --environment jsdom`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add apps/web/src/App.tsx apps/web/src/App.test.tsx apps/web/src/pages/Login.tsx
git commit -m "feat: gate frontend with cognito session"
```

---

### Task 5: Dashboard Courses from API

**Files:**
- Modify: `apps/web/src/pages/Dashboard.tsx`
- Modify: `apps/web/src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Add this test to `apps/web/src/App.test.tsx`:

```tsx
  it("renders courses returned by the protected API", async () => {
    localStorage.setItem("ai-study-planner.auth", JSON.stringify({
      idToken: "id-token-1",
      accessToken: "access-token-1"
    }));
    listCourses.mockResolvedValueOnce([{
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/App.test.tsx --environment jsdom`

Expected: FAIL because `Dashboard` still renders static course names and does not show `Exam: 2026-06-20`.

- [ ] **Step 3: Write minimal implementation**

Replace `apps/web/src/pages/Dashboard.tsx` with:

```tsx
import { useEffect, useState } from "react";
import type { Course } from "@ai-study-planner/shared";
import { listCourses } from "../api/client";

const todayTasks = ["Review SQS basics", "Summarize Lambda notes", "Practice API Gateway quiz"];
const deadlines = ["Cloud Computing exam: 2026-06-10", "Project demo: 2026-06-14"];
const summaries = ["Queues decouple producers from processors.", "Serverless scales per event load."];
const notifications = ["Reminder email scheduled for today", "Material processing ready"];

interface DashboardProps {
  token: string;
}

export function Dashboard({ token }: DashboardProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setError("");

    listCourses(token)
      .then((nextCourses) => {
        if (isCurrent) setCourses(nextCourses);
      })
      .catch(() => {
        if (isCurrent) setError("Could not load courses.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [token]);

  return (
    <div className="page-grid">
      <Panel title="Today's tasks" items={todayTasks} />
      <CoursesPanel courses={courses} isLoading={isLoading} error={error} />
      <Panel title="Upcoming deadlines" items={deadlines} />
      <Panel title="Recent summaries" items={summaries} />
      <Panel title="Notifications" items={notifications} />
    </div>
  );
}

function CoursesPanel({ courses, isLoading, error }: { courses: Course[]; isLoading: boolean; error: string }) {
  return (
    <section className="panel">
      <h2>Active courses</h2>
      {isLoading ? <p>Loading courses...</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!isLoading && !error && courses.length === 0 ? <p>No courses yet.</p> : null}
      {!isLoading && !error && courses.length > 0 ? (
        <ul>
          {courses.map((course) => (
            <li key={course.courseId}>
              <span>{course.name}</span>
              <small>Exam: {course.examDate}</small>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function Panel({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/src/App.test.tsx --environment jsdom`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add apps/web/src/pages/Dashboard.tsx apps/web/src/App.test.tsx
git commit -m "feat: load dashboard courses from api"
```

---

### Task 6: Final Verification

**Files:**
- Verify all changed frontend files.

- [ ] **Step 1: Run focused frontend tests**

Run: `npm --workspace apps/web run test`

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Run frontend build**

Run: `npm --workspace apps/web run build`

Expected: PASS and Vite emits `apps/web/dist`.

- [ ] **Step 4: Commit verification-only fixes if needed**

If verification finds compile or test issues, fix only the affected frontend files, rerun the failing command, then commit:

```bash
git add apps/web
git commit -m "fix: stabilize frontend cognito auth"
```

If no fixes are needed, do not create an empty commit.

---

## Self-Review

- Spec coverage: direct Cognito login is covered by Task 3; session persistence by Task 2 and Task 4; bearer token API calls by Task 1 and Task 5; UI route proof through `GET /courses` by Task 5; verification by Task 6.
- Placeholder scan: no TBD/TODO/fill-in steps remain.
- Type consistency: `AuthSession`, `loginWithCognito`, `listCourses`, and `Dashboard token` signatures are defined before they are consumed.
