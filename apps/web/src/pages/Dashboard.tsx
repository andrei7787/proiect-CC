import { useEffect, useState } from "react";
import type { Course, Notification, StudyTask } from "@ai-study-planner/shared";
import { getDashboard, type DashboardData, type DashboardDeadline, type DashboardSummary } from "../api/client";

interface DashboardProps {
  token: string;
  onCreateCourse?: () => void;
}

export function Dashboard({ token, onCreateCourse }: DashboardProps) {
  const [dashboard, setDashboard] = useState<DashboardData>({
    courses: [],
    todayTasks: [],
    deadlines: [],
    summaries: [],
    notifications: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setError("");

    getDashboard(token)
      .then((nextDashboard) => {
        if (isCurrent) setDashboard(nextDashboard);
      })
      .catch(() => {
        if (isCurrent) setError("Could not load dashboard.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [token]);

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner" />
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  const stats = {
    courses: dashboard.courses.length,
    tasks: dashboard.todayTasks.length,
    done: dashboard.todayTasks.filter((t) => t.status === "done").length,
    notifications: dashboard.notifications.length
  };

  return (
    <div className="dashboard">
      <header className="dashboard-hero">
        <div>
          <h1>Dashboard</h1>
          <p>{greeting()}. Here's your study overview for today.</p>
        </div>
        {onCreateCourse ? (
          <button type="button" className="hero-cta" onClick={onCreateCourse}>
            + New Course
          </button>
        ) : null}
      </header>

      <div className="stats-row">
        <StatCard label="Active courses" value={stats.courses} icon="📚" />
        <StatCard label="Today's tasks" value={stats.tasks} icon="📋" />
        <StatCard label="Completed" value={stats.done} icon="✅" />
        <StatCard label="Unread" value={stats.notifications} icon="🔔" />
      </div>

      <div className="page-grid">
        <TasksPanel tasks={dashboard.todayTasks} />
        <CoursesPanel courses={dashboard.courses} />
        <DeadlinesPanel deadlines={dashboard.deadlines} />
        <SummariesPanel summaries={dashboard.summaries} />
        <NotificationsPanel notifications={dashboard.notifications} />
      </div>
    </div>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function CoursesPanel({ courses }: { courses: Course[] }) {
  return (
    <section className="panel">
      <h2>Active courses</h2>
      {courses.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📚</span>
          <p>No courses yet.</p>
          <small>Create your first course to get started with AI study plans.</small>
        </div>
      ) : (
        <ul>
          {courses.map((course) => (
            <li key={course.courseId}>
              <div>
                <span className="item-title">{course.name}</span>
                <small>{course.difficulty} · {course.weeklyHoursAvailable}h/week</small>
              </div>
              <span className="item-meta">Exam: {course.examDate}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TasksPanel({ tasks }: { tasks: StudyTask[] }) {
  const done = tasks.filter((t) => t.status === "done").length;
  return (
    <section className="panel">
      <h2>Today's tasks</h2>
      {tasks.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🎯</span>
          <p>No tasks due today.</p>
          <small>Upload course materials and generate a study plan to see tasks here.</small>
        </div>
      ) : (
        <>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${tasks.length > 0 ? (done / tasks.length) * 100 : 0}%` }}
            />
          </div>
          <p className="progress-text">{done}/{tasks.length} completed</p>
          <ul>
            {tasks.map((task) => (
              <li key={task.taskId}>
                <div>
                  <span className={`item-title ${task.status === "done" ? "task-done" : ""}`}>
                    {task.title}
                  </span>
                  <small>{task.estimatedMinutes} min</small>
                </div>
                <span className={`status-badge status-${task.status === "done" ? "ready" : "uploaded"}`}>
                  {task.status}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function DeadlinesPanel({ deadlines }: { deadlines: DashboardDeadline[] }) {
  return (
    <section className="panel">
      <h2>Upcoming deadlines</h2>
      {deadlines.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📅</span>
          <p>No upcoming deadlines.</p>
        </div>
      ) : (
        <ul>
          {deadlines.map((deadline) => (
            <li key={deadline.courseId}>
              <span className="item-title">{deadline.courseName}</span>
              <span className="item-meta">Exam: {deadline.examDate}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SummariesPanel({ summaries }: { summaries: DashboardSummary[] }) {
  return (
    <section className="panel">
      <h2>Recent summaries</h2>
      {summaries.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🤖</span>
          <p>No AI summaries yet.</p>
          <small>Upload a study material and let Gemini analyze it.</small>
        </div>
      ) : (
        <ul>
          {summaries.map((summary) => (
            <li key={summary.materialId}>
              <div>
                <span className="item-title">{summary.fileName}</span>
                <small>{summary.summary?.slice(0, 100)}...</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NotificationsPanel({ notifications }: { notifications: Notification[] }) {
  return (
    <section className="panel">
      <h2>Notifications</h2>
      {notifications.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🔔</span>
          <p>No notifications yet.</p>
          <small>Reminders and study alerts will appear here.</small>
        </div>
      ) : (
        <ul>
          {notifications.map((notification) => (
            <li key={notification.notificationId} className="notification-item">
              <span>{notification.message}</span>
              <small>{notification.status}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
