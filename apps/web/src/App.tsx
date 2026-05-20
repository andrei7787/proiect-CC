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
        {view === "course" && <CourseDetail token={session.idToken} />}
      </section>
    </main>
  );
}
