import { useState } from "react";
import {
	confirmRegistration,
	loginWithCognito,
	registerWithCognito,
} from "./auth/cognito";
import {
	clearStoredSession,
	loadStoredSession,
	saveStoredSession,
	type AuthSession,
} from "./auth/session";
import { createCourse } from "./api/client";
import { CourseCreate } from "./pages/CourseCreate";
import { CourseDetail } from "./pages/CourseDetail";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";

type View = "dashboard" | "course" | "course-create";

export function App() {
	const [session, setSession] = useState<AuthSession | null>(() =>
		loadStoredSession(),
	);
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

	async function handleRegister(
		email: string,
		password: string,
	): Promise<string | undefined> {
		const result = await registerWithCognito(email, password);
		return result.destination;
	}

	async function handleConfirm(email: string, code: string) {
		await confirmRegistration(email, code);
	}

	async function handleCreateCourse(input: {
		name: string;
		examDate: string;
		difficulty: string;
		weeklyHoursAvailable: number;
	}) {
		if (!session) return;
		await createCourse(session.idToken, input);
		setView("course");
	}

	function handleLogout() {
		clearStoredSession();
		setSession(null);
	}

	if (!session) {
		return (
			<main className="app-shell">
				<aside className="sidebar" aria-label="Brand">
					<div className="sidebar-logo">
						StudyPlanner
						<span>AI-Powered</span>
					</div>
				</aside>
				<section className="content login-wrapper">
					<Login
						error={loginError}
						isSubmitting={isLoggingIn}
						onLogin={handleLogin}
						onRegister={handleRegister}
						onConfirm={handleConfirm}
					/>
				</section>
			</main>
		);
	}

	return (
		<main className="app-shell">
			<aside className="sidebar">
				<div className="sidebar-logo">
					StudyPlanner
					<span>AI-Powered</span>
				</div>
				<nav aria-label="Primary">
					<button
						type="button"
						className={view === "dashboard" ? "nav-active" : ""}
						onClick={() => setView("dashboard")}
					>
						Dashboard
					</button>
					<button
						type="button"
						className={
							view === "course" || view === "course-create" ? "nav-active" : ""
						}
						onClick={() => setView("course")}
					>
						Course
					</button>
				</nav>
				<div className="sidebar-footer">
					<button type="button" onClick={handleLogout}>
						Logout
					</button>
				</div>
			</aside>
			<section className="content">
				{view === "dashboard" && (
					<Dashboard
						token={session.idToken}
						onCreateCourse={() => setView("course-create")}
					/>
				)}
				{view === "course" && <CourseDetail token={session.idToken} />}
				{view === "course-create" && (
					<CourseCreate
						token={session.idToken}
						onCreate={handleCreateCourse}
						onCancel={() => setView("dashboard")}
					/>
				)}
			</section>
		</main>
	);
}
