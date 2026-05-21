import { useEffect, useState } from "react";
import type { Course, Notification, StudyTask } from "@ai-study-planner/shared";
import {
	getDashboard,
	type DashboardData,
	type DashboardDeadline,
	type DashboardSummary,
} from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { useToast } from "../components/Toast";

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
		notifications: [],
	});
	const [isLoading, setIsLoading] = useState(true);
	const { toast } = useToast();

	useEffect(() => {
		let isCurrent = true;
		setIsLoading(true);

		getDashboard(token)
			.then((nextDashboard) => {
				if (isCurrent) setDashboard(nextDashboard);
			})
			.catch(() => {
				if (isCurrent) toast("Could not load dashboard.", "error");
			})
			.finally(() => {
				if (isCurrent) setIsLoading(false);
			});

		return () => {
			isCurrent = false;
		};
	}, [token, toast]);

	if (isLoading) {
		return (
			<div className="dashboard">
				<header className="dashboard-hero">
					<div>
						<h1>Dashboard</h1>
						<Skeleton.Text lines={1} />
					</div>
				</header>

				<div className="stats-row">
					<Skeleton.StatCard />
					<Skeleton.StatCard />
					<Skeleton.StatCard />
					<Skeleton.StatCard />
				</div>

				<div className="page-grid">
					<Skeleton.Card />
					<Skeleton.Card />
					<Skeleton.Card />
					<Skeleton.Card />
				</div>
			</div>
		);
	}

	const stats = {
		courses: dashboard.courses.length,
		tasks: dashboard.todayTasks.length,
		done: dashboard.todayTasks.filter((t) => t.status === "done").length,
		notifications: dashboard.notifications.length,
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

function StatCard({
	label,
	value,
	icon,
}: {
	label: string;
	value: number;
	icon: string;
}) {
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
				<EmptyState
					icon="books"
					title="No courses yet"
					description="Create your first course to get started with AI study plans."
				/>
			) : (
				<ul>
					{courses.map((course) => (
						<li key={course.courseId}>
							<div>
								<span className="item-title">{course.name}</span>
								<small>
									{course.difficulty} · {course.weeklyHoursAvailable}h/week
								</small>
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
				<EmptyState
					icon="target"
					title="No tasks due today"
					description="Upload course materials and generate a study plan to see tasks here."
				/>
			) : (
				<>
					<div className="progress-bar">
						<div
							className="progress-fill"
							style={{
								width: `${tasks.length > 0 ? (done / tasks.length) * 100 : 0}%`,
							}}
						/>
					</div>
					<p className="progress-text">
						{done}/{tasks.length} completed
					</p>
					<ul>
						{tasks.map((task) => (
							<li key={task.taskId}>
								<div>
									<span
										className={`item-title ${task.status === "done" ? "task-done" : ""}`}
									>
										{task.title}
									</span>
									<small>{task.estimatedMinutes} min</small>
								</div>
								<span
									className={`status-badge status-${task.status}`}
								>
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
				<EmptyState
					icon="calendar"
					title="No upcoming deadlines"
				/>
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
				<EmptyState
					icon="brain"
					title="No AI summaries yet"
					description="Upload a study material and let Gemini analyze it."
				/>
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

function NotificationsPanel({
	notifications,
}: {
	notifications: Notification[];
}) {
	return (
		<section className="panel">
			<h2>Notifications</h2>
			{notifications.length === 0 ? (
				<EmptyState
					icon="bell"
					title="No notifications yet"
					description="Reminders and study alerts will appear here."
				/>
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
