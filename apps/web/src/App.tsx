import { useState } from "react";
import { CourseDetail } from "./pages/CourseDetail";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";

type View = "dashboard" | "course" | "login";

export function App() {
  const [view, setView] = useState<View>("dashboard");

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <h1>AI Study Planner</h1>
        <nav aria-label="Primary">
          <button type="button" onClick={() => setView("dashboard")}>Dashboard</button>
          <button type="button" onClick={() => setView("course")}>Course</button>
          <button type="button" onClick={() => setView("login")}>Login</button>
        </nav>
      </aside>
      <section className="content">
        {view === "dashboard" && <Dashboard />}
        {view === "course" && <CourseDetail />}
        {view === "login" && <Login />}
      </section>
    </main>
  );
}
