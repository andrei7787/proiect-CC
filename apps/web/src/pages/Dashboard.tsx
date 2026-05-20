import { useEffect, useState } from "react";
import type { Course, Notification, StudyTask } from "@ai-study-planner/shared";
import { getDashboard, type DashboardData, type DashboardDeadline, type DashboardSummary } from "../api/client";

interface DashboardProps {
  token: string;
}

export function Dashboard({ token }: DashboardProps) {
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

  return (
    <div className="page-grid">
      <TasksPanel tasks={dashboard.todayTasks} isLoading={isLoading} error={error} />
      <CoursesPanel courses={dashboard.courses} isLoading={isLoading} error={error} />
      <DeadlinesPanel deadlines={dashboard.deadlines} isLoading={isLoading} error={error} />
      <SummariesPanel summaries={dashboard.summaries} isLoading={isLoading} error={error} />
      <NotificationsPanel notifications={dashboard.notifications} isLoading={isLoading} error={error} />
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

function TasksPanel({ tasks, isLoading, error }: { tasks: StudyTask[]; isLoading: boolean; error: string }) {
  return (
    <section className="panel">
      <h2>Today's tasks</h2>
      {isLoading ? <p>Loading tasks...</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!isLoading && !error && tasks.length === 0 ? <p>No tasks due today.</p> : null}
      {!isLoading && !error && tasks.length > 0 ? (
        <ul>
          {tasks.map((task) => (
            <li key={task.taskId}>
              <span>{task.title}</span>
              <small>{task.estimatedMinutes} min</small>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function DeadlinesPanel({ deadlines, isLoading, error }: {
  deadlines: DashboardDeadline[];
  isLoading: boolean;
  error: string;
}) {
  return (
    <section className="panel">
      <h2>Upcoming deadlines</h2>
      {isLoading ? <p>Loading deadlines...</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!isLoading && !error && deadlines.length === 0 ? <p>No deadlines yet.</p> : null}
      {!isLoading && !error && deadlines.length > 0 ? (
        <ul>
          {deadlines.map((deadline) => (
            <li key={deadline.courseId}>
              <span>{deadline.courseName}</span>
              <small>Exam: {deadline.examDate}</small>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function SummariesPanel({ summaries, isLoading, error }: {
  summaries: DashboardSummary[];
  isLoading: boolean;
  error: string;
}) {
  return (
    <section className="panel">
      <h2>Recent summaries</h2>
      {isLoading ? <p>Loading summaries...</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!isLoading && !error && summaries.length === 0 ? <p>No ready summaries yet.</p> : null}
      {!isLoading && !error && summaries.length > 0 ? (
        <ul>
          {summaries.map((summary) => (
            <li key={summary.materialId}>
              <span>{summary.summary}</span>
              <small>{summary.fileName}</small>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function NotificationsPanel({ notifications, isLoading, error }: {
  notifications: Notification[];
  isLoading: boolean;
  error: string;
}) {
  return (
    <section className="panel">
      <h2>Notifications</h2>
      {isLoading ? <p>Loading notifications...</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!isLoading && !error && notifications.length === 0 ? <p>No notifications yet.</p> : null}
      {!isLoading && !error && notifications.length > 0 ? (
        <ul>
          {notifications.map((notification) => (
            <li key={notification.notificationId}>
              <span>{notification.message}</span>
              <small>{notification.status}</small>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
