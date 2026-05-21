import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const mocks = vi.hoisted(() => ({
	loginWithCognito: vi.fn(),
	registerWithCognito: vi.fn(),
	confirmRegistration: vi.fn(),
	createCourse: vi.fn(),
	getDashboard: vi.fn(),
	listCourses: vi.fn(),
	createMaterialUpload: vi.fn(),
	uploadFileToUrl: vi.fn(),
	queueMaterialProcessing: vi.fn(),
	listCourseMaterials: vi.fn(),
	generateStudyPlan: vi.fn(),
	listCourseTasks: vi.fn(),
	updateStudyTaskStatus: vi.fn(),
	runReminders: vi.fn(),
}));

vi.mock("./auth/cognito", () => ({
	loginWithCognito: mocks.loginWithCognito,
	registerWithCognito: mocks.registerWithCognito,
	confirmRegistration: mocks.confirmRegistration,
}));
vi.mock("./api/client", () => ({
	createCourse: mocks.createCourse,
	getDashboard: mocks.getDashboard,
	listCourses: mocks.listCourses,
	createMaterialUpload: mocks.createMaterialUpload,
	uploadFileToUrl: mocks.uploadFileToUrl,
	queueMaterialProcessing: mocks.queueMaterialProcessing,
	listCourseMaterials: mocks.listCourseMaterials,
	generateStudyPlan: mocks.generateStudyPlan,
	listCourseTasks: mocks.listCourseTasks,
	updateStudyTaskStatus: mocks.updateStudyTaskStatus,
	runReminders: mocks.runReminders,
}));

describe("App", () => {
	beforeEach(() => {
		localStorage.clear();
		mocks.loginWithCognito.mockReset();
		mocks.registerWithCognito.mockReset();
		mocks.confirmRegistration.mockReset();
		mocks.createCourse.mockReset();
		mocks.getDashboard.mockReset();
		mocks.getDashboard.mockResolvedValue({
			courses: [],
			todayTasks: [],
			deadlines: [],
			summaries: [],
			notifications: [],
		});
		mocks.listCourses.mockReset();
		mocks.listCourses.mockResolvedValue([]);
		mocks.createMaterialUpload.mockReset();
		mocks.uploadFileToUrl.mockReset();
		mocks.queueMaterialProcessing.mockReset();
		mocks.listCourseMaterials.mockReset();
		mocks.listCourseMaterials.mockResolvedValue([]);
		mocks.generateStudyPlan.mockReset();
		mocks.listCourseTasks.mockReset();
		mocks.listCourseTasks.mockResolvedValue([]);
		mocks.updateStudyTaskStatus.mockReset();
		mocks.runReminders.mockReset();
		mocks.runReminders.mockResolvedValue({ sent: 0 });
	});

	afterEach(() => {
		cleanup();
	});

	it("shows login before a session exists", () => {
		render(<App />);

		expect(
			screen.getByRole("heading", { name: "Welcome back" }),
		).toBeInTheDocument();
		expect(screen.queryByText("Today's tasks")).not.toBeInTheDocument();
	});

	it("signs in and loads the dashboard with the Cognito id token", async () => {
		mocks.loginWithCognito.mockResolvedValueOnce({
			idToken: "id-token-1",
			accessToken: "access-token-1",
			refreshToken: "refresh-token-1",
		});

		render(<App />);
		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "student@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "Password123!" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));

		expect(await screen.findByText("StudyPlanner")).toBeInTheDocument();
		expect(localStorage.getItem("ai-study-planner.auth")).toContain(
			"id-token-1",
		);
	});

	it("shows registration form when clicking create account", async () => {
		render(<App />);
		fireEvent.click(
			screen.getByRole("button", { name: "New student? Create an account" }),
		);

		expect(
			screen.getByRole("heading", { name: "Create account" }),
		).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText("student@example.com"),
		).toBeInTheDocument();
	});

	it("registers and shows confirmation step", async () => {
		mocks.registerWithCognito.mockResolvedValueOnce({
			userId: "user-1",
			destination: "s***@e***",
		});

		render(<App />);
		fireEvent.click(
			screen.getByRole("button", { name: "New student? Create an account" }),
		);
		fireEvent.change(screen.getByPlaceholderText("student@example.com"), {
			target: { value: "new@test.com" },
		});
		fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
			target: { value: "Password123!" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Create account" }));

		expect(await screen.findByText(/s\*\*\*@e\*\*\*/)).toBeInTheDocument();
		expect(mocks.registerWithCognito).toHaveBeenCalledWith(
			"new@test.com",
			"Password123!",
		);
	});

	it("logs out and clears the authenticated view", async () => {
		localStorage.setItem(
			"ai-study-planner.auth",
			JSON.stringify({
				idToken: "id-token-1",
				accessToken: "access-token-1",
			}),
		);

		render(<App />);
		fireEvent.click(screen.getByRole("button", { name: "Logout" }));

		expect(
			screen.getByRole("heading", { name: "Welcome back" }),
		).toBeInTheDocument();
		expect(localStorage.getItem("ai-study-planner.auth")).toBeNull();
	});

	it("renders dashboard data returned by the protected API", async () => {
		localStorage.setItem(
			"ai-study-planner.auth",
			JSON.stringify({
				idToken: "id-token-1",
				accessToken: "access-token-1",
			}),
		);
		mocks.getDashboard.mockResolvedValueOnce({
			courses: [
				{
					courseId: "course-1",
					userId: "user-1",
					name: "Distributed Systems",
					examDate: "2026-06-20",
					difficulty: "medium",
					weeklyHoursAvailable: 6,
					createdAt: "2026-05-14T00:00:00.000Z",
					updatedAt: "2026-05-14T00:00:00.000Z",
				},
			],
			todayTasks: [
				{
					taskId: "task-1",
					planId: "plan-1",
					courseId: "course-1",
					userId: "user-1",
					date: "2026-05-20",
					title: "Review SQS",
					description: "Review queue basics.",
					estimatedMinutes: 30,
					status: "todo",
				},
			],
			deadlines: [
				{
					courseId: "course-1",
					courseName: "Distributed Systems",
					examDate: "2026-06-20",
				},
			],
			summaries: [
				{
					materialId: "mat-1",
					courseId: "course-1",
					fileName: "serverless.pdf",
					summary: "Queues decouple producers from processors.",
					keyConcepts: ["SQS"],
					processedAt: "2026-05-20T10:01:00.000Z",
				},
			],
			notifications: [
				{
					notificationId: "notification-1",
					userId: "user-1",
					taskId: "task-1",
					type: "study-task",
					message: "Reminder: Review SQS is due today",
					status: "created",
					createdAt: "2026-05-20T11:00:00.000Z",
				},
			],
		});

		render(<App />);

		expect(await screen.findAllByText("Distributed Systems")).toHaveLength(2);
		expect(screen.getAllByText("Exam: 2026-06-20")).toHaveLength(2);
		expect(screen.getByText("Review SQS")).toBeInTheDocument();
		expect(screen.getByText(/Queues decouple producers/)).toBeInTheDocument();
		expect(
			screen.getByText("Reminder: Review SQS is due today"),
		).toBeInTheDocument();
	});

	it("creates a course and navigates to course view", async () => {
		localStorage.setItem(
			"ai-study-planner.auth",
			JSON.stringify({
				idToken: "id-token-1",
				accessToken: "access-token-1",
			}),
		);
		mocks.getDashboard.mockResolvedValueOnce({
			courses: [],
			todayTasks: [],
			deadlines: [],
			summaries: [],
			notifications: [],
		});
		mocks.createCourse.mockResolvedValueOnce({
			courseId: "course-new",
			userId: "user-1",
			name: "Cloud Computing",
			examDate: "2026-06-10",
			difficulty: "medium",
			weeklyHoursAvailable: 10,
			createdAt: "2026-05-21T00:00:00.000Z",
			updatedAt: "2026-05-21T00:00:00.000Z",
		});

		render(<App />);
		fireEvent.click(
			await screen.findByRole("button", { name: "+ New Course" }),
		);

		fireEvent.change(screen.getByPlaceholderText("e.g. Cloud Computing"), {
			target: { value: "Cloud Computing" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Create course" }));

		expect(mocks.createCourse).toHaveBeenCalledWith(
			"id-token-1",
			expect.objectContaining({
				name: "Cloud Computing",
				difficulty: "medium",
				weeklyHoursAvailable: 10,
			}),
		);
	});

	it("uploads a material for the first course and queues processing", async () => {
		localStorage.setItem(
			"ai-study-planner.auth",
			JSON.stringify({
				idToken: "id-token-1",
				accessToken: "access-token-1",
			}),
		);
		mocks.listCourses.mockResolvedValueOnce([
			{
				courseId: "course-1",
				userId: "user-1",
				name: "Cloud Computing",
				examDate: "2026-06-10",
				difficulty: "hard",
				weeklyHoursAvailable: 8,
				createdAt: "2026-05-14T00:00:00.000Z",
				updatedAt: "2026-05-14T00:00:00.000Z",
			},
		]);
		mocks.createMaterialUpload.mockResolvedValueOnce({
			material: {
				materialId: "mat-1",
				courseId: "course-1",
				userId: "user-1",
				fileName: "serverless.pdf",
				s3Key: "user-1/course-1/mat-1-serverless.pdf",
				contentType: "application/pdf",
				status: "uploaded",
				createdAt: "2026-05-20T10:00:00.000Z",
			},
			uploadUrl: "https://upload.example/mat-1",
		});
		mocks.listCourseMaterials.mockResolvedValueOnce([]).mockResolvedValueOnce([
			{
				materialId: "mat-1",
				courseId: "course-1",
				userId: "user-1",
				fileName: "serverless.pdf",
				s3Key: "user-1/course-1/mat-1-serverless.pdf",
				contentType: "application/pdf",
				status: "processing",
				createdAt: "2026-05-20T10:00:00.000Z",
			},
		]);

		render(<App />);
		fireEvent.click(screen.getByRole("button", { name: "Course" }));

		expect(
			await screen.findByRole("heading", { name: "Cloud Computing" }),
		).toBeInTheDocument();
		const file = new File(["pdf"], "serverless.pdf", {
			type: "application/pdf",
		});
		fireEvent.change(screen.getByLabelText("Material file"), {
			target: { files: [file] },
		});
		fireEvent.click(screen.getByRole("button", { name: "Upload and process" }));

		expect(await screen.findByText("serverless.pdf")).toBeInTheDocument();
		expect(screen.getByText("processing")).toBeInTheDocument();
		expect(mocks.createMaterialUpload).toHaveBeenCalledWith("id-token-1", {
			courseId: "course-1",
			fileName: "serverless.pdf",
			contentType: "application/pdf",
		});
		expect(mocks.uploadFileToUrl).toHaveBeenCalledWith(
			"https://upload.example/mat-1",
			file,
		);
		expect(mocks.queueMaterialProcessing).toHaveBeenCalledWith(
			"id-token-1",
			"mat-1",
		);
		expect(mocks.listCourseMaterials).toHaveBeenCalledWith(
			"id-token-1",
			"course-1",
		);
	});

	it("generates a study plan, renders tasks, and updates task status", async () => {
		localStorage.setItem(
			"ai-study-planner.auth",
			JSON.stringify({
				idToken: "id-token-1",
				accessToken: "access-token-1",
			}),
		);
		mocks.listCourses.mockResolvedValueOnce([
			{
				courseId: "course-1",
				userId: "user-1",
				name: "Cloud Computing",
				examDate: "2026-06-10",
				difficulty: "hard",
				weeklyHoursAvailable: 8,
				createdAt: "2026-05-14T00:00:00.000Z",
				updatedAt: "2026-05-14T00:00:00.000Z",
			},
		]);
		mocks.listCourseMaterials.mockResolvedValueOnce([
			{
				materialId: "mat-1",
				courseId: "course-1",
				userId: "user-1",
				fileName: "serverless.pdf",
				s3Key: "user-1/course-1/mat-1-serverless.pdf",
				contentType: "application/pdf",
				status: "ready",
				summary: "Queues decouple producers from processors.",
				keyConcepts: ["SQS"],
				createdAt: "2026-05-20T10:00:00.000Z",
				processedAt: "2026-05-20T10:01:00.000Z",
			},
		]);
		mocks.generateStudyPlan.mockResolvedValueOnce({
			plan: {
				planId: "plan-1",
				courseId: "course-1",
				userId: "user-1",
				generatedFromMaterialIds: ["mat-1"],
				startDate: "2026-05-20",
				examDate: "2026-06-10",
				createdAt: "2026-05-20T10:00:00.000Z",
			},
			tasks: [
				{
					taskId: "task-1",
					planId: "plan-1",
					courseId: "course-1",
					userId: "user-1",
					date: "2026-05-20",
					title: "Review SQS",
					description: "Review queue basics.",
					estimatedMinutes: 30,
					status: "todo",
				},
			],
		});
		mocks.listCourseTasks.mockResolvedValueOnce([]).mockResolvedValueOnce([
			{
				taskId: "task-1",
				planId: "plan-1",
				courseId: "course-1",
				userId: "user-1",
				date: "2026-05-20",
				title: "Review SQS",
				description: "Review queue basics.",
				estimatedMinutes: 30,
				status: "todo",
			},
		]);
		mocks.updateStudyTaskStatus.mockResolvedValueOnce({
			taskId: "task-1",
			status: "done",
		});

		render(<App />);
		fireEvent.click(screen.getByRole("button", { name: "Course" }));

		expect(
			await screen.findByText("Queues decouple producers from processors."),
		).toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("button", { name: "Generate Study Plan" }),
		);

		expect(await screen.findByText("Review SQS")).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText("Review SQS status"), {
			target: { value: "done" },
		});

		expect(mocks.generateStudyPlan).toHaveBeenCalledWith(
			"id-token-1",
			"course-1",
		);
		expect(mocks.listCourseTasks).toHaveBeenCalledWith(
			"id-token-1",
			"course-1",
		);
		expect(mocks.updateStudyTaskStatus).toHaveBeenCalledWith(
			"id-token-1",
			"task-1",
			"done",
		);
	});

	it("triggers reminders and shows the count when the user clicks Send Reminders", async () => {
		localStorage.setItem(
			"ai-study-planner.auth",
			JSON.stringify({
				idToken: "id-token-1",
				accessToken: "access-token-1",
			}),
		);
		mocks.listCourses.mockResolvedValueOnce([
			{
				courseId: "course-1",
				userId: "user-1",
				name: "Cloud Computing",
				examDate: "2026-06-10",
				difficulty: "hard",
				weeklyHoursAvailable: 8,
				createdAt: "2026-05-14T00:00:00.000Z",
				updatedAt: "2026-05-14T00:00:00.000Z",
			},
		]);
		mocks.runReminders.mockResolvedValueOnce({ sent: 2 });

		render(<App />);
		fireEvent.click(screen.getByRole("button", { name: "Course" }));

		expect(
			await screen.findByRole("button", { name: "Send Reminders" }),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Send Reminders" }));

		expect(mocks.runReminders).toHaveBeenCalledWith("id-token-1");
		expect(await screen.findByText(/2 reminder/)).toBeInTheDocument();
	});

	// ── Error state tests ──

	it("shows login error when credentials are invalid", async () => {
		mocks.loginWithCognito.mockRejectedValueOnce(new Error("Unauthorized"));

		render(<App />);
		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "wrong@test.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "wrongpass" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));

		expect(
			await screen.findByText("Sign in failed. Check your email and password."),
		).toBeInTheDocument();
	});

	it("shows registration error when email is already taken", async () => {
		mocks.registerWithCognito.mockRejectedValueOnce(
			new Error("UsernameExistsException"),
		);

		render(<App />);
		fireEvent.click(
			screen.getByRole("button", { name: "New student? Create an account" }),
		);
		fireEvent.change(screen.getByPlaceholderText("student@example.com"), {
			target: { value: "existing@test.com" },
		});
		fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
			target: { value: "Password123!" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Create account" }));

		expect(
			await screen.findByText("Registration failed. Try a different email."),
		).toBeInTheDocument();
	});

	it("shows confirm error when code is invalid", async () => {
		mocks.registerWithCognito.mockResolvedValueOnce({
			userId: "user-1",
			destination: "s***@e***",
		});
		mocks.confirmRegistration.mockRejectedValueOnce(
			new Error("CodeMismatchException"),
		);

		render(<App />);
		fireEvent.click(
			screen.getByRole("button", { name: "New student? Create an account" }),
		);
		fireEvent.change(screen.getByPlaceholderText("student@example.com"), {
			target: { value: "new@test.com" },
		});
		fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
			target: { value: "Password123!" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Create account" }));

		await screen.findByRole("heading", { name: "Check your email" });
		fireEvent.change(screen.getByPlaceholderText("000000"), {
			target: { value: "123456" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Activate account" }));

		expect(
			await screen.findByText("Invalid confirmation code or sign-in failed."),
		).toBeInTheDocument();
	});

	it("shows dashboard error when API fails", async () => {
		localStorage.setItem(
			"ai-study-planner.auth",
			JSON.stringify({
				idToken: "id-token-1",
				accessToken: "access-token-1",
			}),
		);
		mocks.getDashboard.mockRejectedValueOnce(new Error("Network error"));

		render(<App />);

		expect(
			await screen.findByText("Could not load dashboard."),
		).toBeInTheDocument();
	});

	it("shows course creation error", async () => {
		localStorage.setItem(
			"ai-study-planner.auth",
			JSON.stringify({
				idToken: "id-token-1",
				accessToken: "access-token-1",
			}),
		);
		mocks.getDashboard.mockResolvedValueOnce({
			courses: [],
			todayTasks: [],
			deadlines: [],
			summaries: [],
			notifications: [],
		});
		mocks.createCourse.mockRejectedValueOnce(new Error("Conflict"));

		render(<App />);
		fireEvent.click(
			await screen.findByRole("button", { name: "+ New Course" }),
		);
		fireEvent.change(screen.getByPlaceholderText("e.g. Cloud Computing"), {
			target: { value: "Test" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Create course" }));

		expect(
			await screen.findByText("Could not create course. Please try again."),
		).toBeInTheDocument();
	});

	it("reverts task status on update failure", async () => {
		localStorage.setItem(
			"ai-study-planner.auth",
			JSON.stringify({
				idToken: "id-token-1",
				accessToken: "access-token-1",
			}),
		);
		mocks.listCourses.mockResolvedValueOnce([
			{
				courseId: "course-1",
				userId: "user-1",
				name: "Cloud Computing",
				examDate: "2026-06-10",
				difficulty: "hard",
				weeklyHoursAvailable: 8,
				createdAt: "2026-05-14T00:00:00.000Z",
				updatedAt: "2026-05-14T00:00:00.000Z",
			},
		]);
		mocks.listCourseMaterials.mockResolvedValueOnce([
			{
				materialId: "mat-1",
				courseId: "course-1",
				userId: "user-1",
				fileName: "serverless.pdf",
				s3Key: "user-1/course-1/mat-1-serverless.pdf",
				contentType: "application/pdf",
				status: "ready",
				summary: "Summary text",
				keyConcepts: ["SQS"],
				createdAt: "2026-05-20T10:00:00.000Z",
				processedAt: "2026-05-20T10:01:00.000Z",
			},
		]);
		mocks.listCourseTasks.mockResolvedValueOnce([
			{
				taskId: "task-1",
				planId: "plan-1",
				courseId: "course-1",
				userId: "user-1",
				date: "2026-05-20",
				title: "Review SQS",
				description: "Review queue basics.",
				estimatedMinutes: 30,
				status: "todo" as const,
			},
		]);
		mocks.updateStudyTaskStatus.mockRejectedValueOnce(
			new Error("Server error"),
		);

		render(<App />);
		fireEvent.click(screen.getByRole("button", { name: "Course" }));

		expect(
			await screen.findByLabelText("Review SQS status"),
		).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText("Review SQS status"), {
			target: { value: "done" },
		});

		expect(
			await screen.findByText("Could not update task status."),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Review SQS status")).toHaveValue("todo");
	});

	it("reverts material status when processing fails", async () => {
		localStorage.setItem(
			"ai-study-planner.auth",
			JSON.stringify({
				idToken: "id-token-1",
				accessToken: "access-token-1",
			}),
		);
		mocks.listCourses.mockResolvedValueOnce([
			{
				courseId: "course-1",
				userId: "user-1",
				name: "Cloud Computing",
				examDate: "2026-06-10",
				difficulty: "hard",
				weeklyHoursAvailable: 8,
				createdAt: "2026-05-14T00:00:00.000Z",
				updatedAt: "2026-05-14T00:00:00.000Z",
			},
		]);
		mocks.listCourseMaterials.mockResolvedValueOnce([
			{
				materialId: "mat-1",
				courseId: "course-1",
				userId: "user-1",
				fileName: "serverless.pdf",
				s3Key: "user-1/course-1/mat-1-serverless.pdf",
				contentType: "application/pdf",
				status: "uploaded" as const,
				createdAt: "2026-05-20T10:00:00.000Z",
			},
		]);
		mocks.queueMaterialProcessing.mockRejectedValueOnce(
			new Error("Queue error"),
		);

		render(<App />);
		fireEvent.click(screen.getByRole("button", { name: "Course" }));

		expect(
			await screen.findByRole("button", { name: "Process" }),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Process" }));

		expect(await screen.findByText(/Process failed/)).toBeInTheDocument();
		expect(screen.getByText("uploaded")).toBeInTheDocument();
	});

	it("shows error when study plan generation fails", async () => {
		localStorage.setItem(
			"ai-study-planner.auth",
			JSON.stringify({
				idToken: "id-token-1",
				accessToken: "access-token-1",
			}),
		);
		mocks.listCourses.mockResolvedValueOnce([
			{
				courseId: "course-1",
				userId: "user-1",
				name: "Cloud Computing",
				examDate: "2026-06-10",
				difficulty: "hard",
				weeklyHoursAvailable: 8,
				createdAt: "2026-05-14T00:00:00.000Z",
				updatedAt: "2026-05-14T00:00:00.000Z",
			},
		]);
		mocks.listCourseMaterials.mockResolvedValueOnce([
			{
				materialId: "mat-1",
				courseId: "course-1",
				userId: "user-1",
				fileName: "serverless.pdf",
				s3Key: "user-1/course-1/mat-1-serverless.pdf",
				contentType: "application/pdf",
				status: "ready" as const,
				summary: "Summary text",
				keyConcepts: ["SQS"],
				createdAt: "2026-05-20T10:00:00.000Z",
				processedAt: "2026-05-20T10:01:00.000Z",
			},
		]);
		mocks.generateStudyPlan.mockRejectedValueOnce(new Error("AI error"));

		render(<App />);
		fireEvent.click(screen.getByRole("button", { name: "Course" }));

		await screen.findByText("Summary text");
		fireEvent.click(
			screen.getByRole("button", { name: "Generate Study Plan" }),
		);

		expect(
			await screen.findByText("Could not generate study plan."),
		).toBeInTheDocument();
	});

	it("shows error when sending reminders fails", async () => {
		localStorage.setItem(
			"ai-study-planner.auth",
			JSON.stringify({
				idToken: "id-token-1",
				accessToken: "access-token-1",
			}),
		);
		mocks.listCourses.mockResolvedValueOnce([
			{
				courseId: "course-1",
				userId: "user-1",
				name: "Cloud Computing",
				examDate: "2026-06-10",
				difficulty: "hard",
				weeklyHoursAvailable: 8,
				createdAt: "2026-05-14T00:00:00.000Z",
				updatedAt: "2026-05-14T00:00:00.000Z",
			},
		]);
		mocks.runReminders.mockRejectedValueOnce(new Error("SNS error"));

		render(<App />);
		fireEvent.click(screen.getByRole("button", { name: "Course" }));

		expect(
			await screen.findByRole("button", { name: "Send Reminders" }),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Send Reminders" }));

		expect(
			await screen.findByText("Could not send reminders."),
		).toBeInTheDocument();
	});

	// ── Navigation tests ──

	it("can navigate from dashboard to course and back", async () => {
		localStorage.setItem(
			"ai-study-planner.auth",
			JSON.stringify({
				idToken: "id-token-1",
				accessToken: "access-token-1",
			}),
		);
		mocks.getDashboard.mockResolvedValue({
			courses: [],
			todayTasks: [],
			deadlines: [],
			summaries: [],
			notifications: [],
		});

		render(<App />);

		await screen.findByRole("heading", { name: "Dashboard" });

		fireEvent.click(screen.getByRole("button", { name: "Course" }));
		expect(
			screen.getByRole("heading", { name: "Course workspace" }),
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
		expect(
			await screen.findByRole("heading", { name: "Dashboard" }),
		).toBeInTheDocument();
	});

	it("cancel returns from course creation to dashboard", async () => {
		localStorage.setItem(
			"ai-study-planner.auth",
			JSON.stringify({
				idToken: "id-token-1",
				accessToken: "access-token-1",
			}),
		);
		mocks.getDashboard.mockResolvedValue({
			courses: [],
			todayTasks: [],
			deadlines: [],
			summaries: [],
			notifications: [],
		});

		render(<App />);

		fireEvent.click(
			await screen.findByRole("button", { name: "+ New Course" }),
		);
		expect(
			screen.getByRole("heading", { name: "New course" }),
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(
			await screen.findByRole("heading", { name: "Dashboard" }),
		).toBeInTheDocument();
	});

	it("shows empty states on fresh dashboard", async () => {
		localStorage.setItem(
			"ai-study-planner.auth",
			JSON.stringify({
				idToken: "id-token-1",
				accessToken: "access-token-1",
			}),
		);
		mocks.getDashboard.mockResolvedValueOnce({
			courses: [],
			todayTasks: [],
			deadlines: [],
			summaries: [],
			notifications: [],
		});

		render(<App />);

		expect(await screen.findByText("No courses yet.")).toBeInTheDocument();
		expect(screen.getByText("No tasks due today.")).toBeInTheDocument();
		expect(screen.getByText("No upcoming deadlines.")).toBeInTheDocument();
		expect(screen.getByText("No AI summaries yet.")).toBeInTheDocument();
		expect(screen.getByText("No notifications yet.")).toBeInTheDocument();
	});
});
