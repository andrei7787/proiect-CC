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
});
