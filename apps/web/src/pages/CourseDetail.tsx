import { useEffect, useMemo, useState } from "react";
import type {
	Course,
	Material,
	StudyTask,
	StudyTaskStatus,
} from "@ai-study-planner/shared";
import {
	createMaterialUpload,
	generateStudyPlan,
	listCourseMaterials,
	listCourseTasks,
	listCourses,
	queueMaterialProcessing,
	runReminders,
	updateStudyTaskStatus,
	uploadFileToUrl,
} from "../api/client";

export interface CourseDetailProps {
	token: string;
	onCreateCourse?: () => void;
}

export function CourseDetail({ token, onCreateCourse }: CourseDetailProps) {
	const [courses, setCourses] = useState<Course[]>([]);
	const [materials, setMaterials] = useState<Material[]>([]);
	const [tasks, setTasks] = useState<StudyTask[]>([]);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [status, setStatus] = useState("PDF, TXT, or MD");
	const [error, setError] = useState("");
	const [isUploading, setIsUploading] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [reminderResult, setReminderResult] = useState("");
	const [isSendingReminders, setIsSendingReminders] = useState(false);

	const course = courses[0];
	const readyMaterial = useMemo(
		() =>
			materials.find(
				(material) => material.status === "ready" && material.summary,
			),
		[materials],
	);

	useEffect(() => {
		let isCurrent = true;
		listCourses(token)
			.then((nextCourses) => {
				if (!isCurrent) return;
				setCourses(nextCourses);
				const firstCourse = nextCourses[0];
				if (firstCourse) {
					void refreshMaterials(
						token,
						firstCourse.courseId,
						isCurrent,
						setMaterials,
					);
					void refreshTasks(token, firstCourse.courseId, isCurrent, setTasks);
				}
			})
			.catch((err: unknown) => {
				if (isCurrent)
					setError(
						`Could not load course: ${err instanceof Error ? err.message : String(err)}`,
					);
			});
		return () => {
			isCurrent = false;
		};
	}, [token]);

	async function handleUpload() {
		if (!course || !selectedFile) return;
		setIsUploading(true);
		setError("");
		setStatus("Uploading material...");
		try {
			const upload = await createMaterialUpload(token, {
				courseId: course.courseId,
				fileName: selectedFile.name,
				contentType:
					selectedFile.type || contentTypeFromName(selectedFile.name),
			});
			await uploadFileToUrl(upload.uploadUrl, selectedFile);
			await queueMaterialProcessing(token, upload.material.materialId);
			const nextMaterials = await listCourseMaterials(token, course.courseId);
			setMaterials(nextMaterials);
			setStatus("Material queued for processing.");
		} catch (err) {
			setError(
				`Could not upload material: ${err instanceof Error ? err.message : String(err)}`,
			);
			setStatus("Upload failed");
		} finally {
			setIsUploading(false);
		}
	}

	async function handleGenerateStudyPlan() {
		if (!course) return;
		setIsGenerating(true);
		setError("");
		try {
			await generateStudyPlan(token, course.courseId);
			setTasks(await listCourseTasks(token, course.courseId));
		} catch {
			setError("Could not generate study plan.");
		} finally {
			setIsGenerating(false);
		}
	}

	async function handleTaskStatusChange(
		taskId: string,
		status: StudyTaskStatus,
	) {
		await updateStudyTaskStatus(token, taskId, status);
		setTasks((currentTasks) =>
			currentTasks.map((task) =>
				task.taskId === taskId ? { ...task, status } : task,
			),
		);
	}

	async function handleSendReminders() {
		setIsSendingReminders(true);
		setError("");
		try {
			const { sent } = await runReminders(token);
			setReminderResult(`${sent} reminder${sent === 1 ? "" : "s"} sent`);
		} catch {
			setError("Could not send reminders.");
		} finally {
			setIsSendingReminders(false);
		}
	}

	if (!course) {
		return (
			<div className="course-layout">
				<section className="panel wide">
					<h2>Course workspace</h2>
					{error ? (
						<p role="alert">{error}</p>
					) : (
						<div className="empty-state">
							<p>No courses yet.</p>
							{onCreateCourse ? (
								<button type="button" onClick={onCreateCourse}>
									Create New Course
								</button>
							) : null}
						</div>
					)}
				</section>
			</div>
		);
	}

	return (
		<div className="course-layout">
			<section className="panel wide">
				<h2>{course.name}</h2>
				<dl>
					<div>
						<dt>Exam date</dt>
						<dd>{course.examDate}</dd>
					</div>
					<div>
						<dt>Difficulty</dt>
						<dd>{course.difficulty}</dd>
					</div>
					<div>
						<dt>Weekly hours</dt>
						<dd>{course.weeklyHoursAvailable}</dd>
					</div>
				</dl>
			</section>

			<section className="panel">
				<h2>Material upload</h2>
				<input
					aria-label="Material file"
					type="file"
					accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
					onChange={(event) => {
						const file = event.target.files?.[0] ?? null;
						setSelectedFile(file);
						setStatus(
							file ? `${file.name} ready to upload` : "PDF, TXT, or MD",
						);
					}}
				/>
				<button
					type="button"
					disabled={!selectedFile || isUploading}
					onClick={handleUpload}
				>
					{isUploading ? "Uploading..." : "Upload and process"}
				</button>
				<p>{status}</p>
				{error ? <p role="alert">{error}</p> : null}
				{materials.length > 0 ? (
					<ul>
						{materials.map((material) => (
							<li key={material.materialId}>
								<span>{material.fileName}</span>
								<span className={`status-badge status-${material.status}`}>
									{material.status}
								</span>
								<button
									type="button"
									className="btn-icon"
									aria-label={`Delete ${material.fileName}`}
									title="Remove material"
									onClick={() => setMaterials((prev) => prev.filter((m) => m.materialId !== material.materialId))}
								>
									✕
								</button>
							</li>
						))}
					</ul>
				) : null}
			</section>

			<section className="panel">
				<h2>AI summary</h2>
				<p>
					{readyMaterial?.summary ??
						"Upload a material and wait for processing to finish."}
				</p>
				<h3>Key concepts</h3>
				{readyMaterial?.keyConcepts?.length ? (
					<ul>
						{readyMaterial.keyConcepts.map((concept) => (
							<li key={concept}>{concept}</li>
						))}
					</ul>
				) : (
					<p>No concepts yet.</p>
				)}
				<button
					type="button"
					disabled={!readyMaterial || isGenerating}
					onClick={handleGenerateStudyPlan}
				>
					{isGenerating ? "Generating..." : "Generate Study Plan"}
				</button>
			</section>

			<section className="panel wide">
				<h2>Study tasks</h2>
				{tasks.length > 0 ? (
					<ul className="task-list">
						{tasks.map((task) => (
							<li key={task.taskId}>
								<div>
									<strong>{task.title}</strong>
									<p>{task.description}</p>
									<small>
										{task.date} - {task.estimatedMinutes} min
									</small>
								</div>
								<select
									aria-label={`${task.title} status`}
									value={task.status}
									onChange={(event) => {
										void handleTaskStatusChange(
											task.taskId,
											event.target.value as StudyTaskStatus,
										);
									}}
								>
									<option value="todo">Todo</option>
									<option value="done">Done</option>
									<option value="skipped">Skipped</option>
								</select>
							</li>
						))}
					</ul>
				) : (
					<p>Generate a study plan after at least one material is ready.</p>
				)}
				<button
					type="button"
					disabled={isSendingReminders}
					onClick={handleSendReminders}
				>
					{isSendingReminders ? "Sending..." : "Send Reminders"}
				</button>
				{reminderResult ? (
					<p className="reminder-ok">{reminderResult}</p>
				) : null}
			</section>
		</div>
	);
}

async function refreshMaterials(
	token: string,
	courseId: string,
	isCurrent: boolean,
	setMaterials: (materials: Material[]) => void,
) {
	const nextMaterials = await listCourseMaterials(token, courseId);
	if (isCurrent) setMaterials(nextMaterials);
}

async function refreshTasks(
	token: string,
	courseId: string,
	isCurrent: boolean,
	setTasks: (tasks: StudyTask[]) => void,
) {
	const nextTasks = await listCourseTasks(token, courseId);
	if (isCurrent) setTasks(nextTasks);
}

function contentTypeFromName(fileName: string): string {
	const lower = fileName.toLowerCase();
	if (lower.endsWith(".pdf")) return "application/pdf";
	if (lower.endsWith(".md")) return "text/markdown";
	return "text/plain";
}
