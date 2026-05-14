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
