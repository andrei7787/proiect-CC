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
import { DropZone } from "../components/DropZone";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";

export interface CourseDetailProps {
	token: string;
	onCreateCourse?: () => void;
}

export function CourseDetail({ token, onCreateCourse }: CourseDetailProps) {
	const [courses, setCourses] = useState<Course[]>([]);
	const [materials, setMaterials] = useState<Material[]>([]);
	const [tasks, setTasks] = useState<StudyTask[]>([]);
	const [selectedFileName, setSelectedFileName] = useState("");
	const [status, setStatus] = useState("PDF, TXT, or MD");
	const [isUploading, setIsUploading] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [reminderResult, setReminderResult] = useState("");
	const [isSendingReminders, setIsSendingReminders] = useState(false);
	const [deleteModal, setDeleteModal] = useState<{ materialId: string; fileName: string } | null>(null);
	const { toast } = useToast();

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
					toast(
						`Could not load course: ${err instanceof Error ? err.message : String(err)}`,
						"error",
					);
			});
		return () => {
			isCurrent = false;
		};
	}, [token, toast]);

	// Auto-poll materials while any is processing
	useEffect(() => {
		const hasProcessing = materials.some((m) => m.status === "processing");
		if (!hasProcessing || !course) return;
		const interval = setInterval(() => {
			refreshMaterials(token, course.courseId, true, setMaterials);
		}, 5000);
		return () => clearInterval(interval);
	}, [materials, token, course?.courseId]);

	async function handleFileDrop(file: File) {
		if (!course) return;
		setIsUploading(true);
		setSelectedFileName(file.name);
		setStatus("Uploading material...");
		try {
			const upload = await createMaterialUpload(token, {
				courseId: course.courseId,
				fileName: file.name,
				contentType:
					file.type || contentTypeFromName(file.name),
			});
			await uploadFileToUrl(upload.uploadUrl, file);
			await queueMaterialProcessing(token, upload.material.materialId);
			const nextMaterials = await listCourseMaterials(token, course.courseId);
			setMaterials(nextMaterials);
			setStatus("Material queued for processing.");
			toast(`${file.name} uploaded and queued for processing.`, "success");
		} catch (err) {
			toast(
				`Could not upload material: ${err instanceof Error ? err.message : String(err)}`,
				"error",
			);
			setStatus("Upload failed");
		} finally {
			setIsUploading(false);
		}
	}

	function handleProcessMaterial(materialId: string) {
		const previousMaterials = materials;
		setMaterials((prev) =>
			prev.map((m) =>
				m.materialId === materialId
					? { ...m, status: "processing" as const }
					: m,
			),
		);
		queueMaterialProcessing(token, materialId)
			.then(() => {
				setStatus("Processing queued — refresh to check status.");
				toast("Processing queued.", "info");
			})
			.catch((err: unknown) => {
				setMaterials(previousMaterials);
				toast(
					`Process failed: ${err instanceof Error ? err.message : String(err)}`,
					"error",
				);
			});
	}

	async function handleGenerateStudyPlan() {
		if (!course) return;
		setIsGenerating(true);
		try {
			await generateStudyPlan(token, course.courseId);
			setTasks(await listCourseTasks(token, course.courseId));
			toast("Study plan generated!", "success");
		} catch {
			toast("Could not generate study plan.", "error");
		} finally {
			setIsGenerating(false);
		}
	}

	async function handleTaskStatusChange(
		taskId: string,
		status: StudyTaskStatus,
	) {
		const previousTasks = tasks;
		setTasks((currentTasks) =>
			currentTasks.map((task) =>
				task.taskId === taskId ? { ...task, status } : task,
			),
		);
		try {
			await updateStudyTaskStatus(token, taskId, status);
		} catch {
			setTasks(previousTasks);
			toast("Could not update task status.", "error");
		}
	}

	async function handleSendReminders() {
		setIsSendingReminders(true);
		try {
			const { sent } = await runReminders(token);
			setReminderResult(`${sent} reminder${sent === 1 ? "" : "s"} sent`);
			toast(`${sent} reminder${sent === 1 ? "" : "s"} sent.`, "success");
		} catch {
			toast("Could not send reminders.", "error");
		} finally {
			setIsSendingReminders(false);
		}
	}

	function handleDeleteConfirm() {
		if (!deleteModal) return;
		setMaterials((prev) =>
			prev.filter((m) => m.materialId !== deleteModal.materialId),
		);
		toast(`${deleteModal.fileName} removed.`, "info");
		setDeleteModal(null);
	}

	if (!course) {
		return (
			<div className="course-layout">
				<section className="panel wide">
					<h2>Course workspace</h2>
					<div className="empty-state">
						<EmptyState
							icon="books"
							title="No courses yet"
							description="Create a course and upload study materials to get AI-powered study plans."
						/>
						{onCreateCourse ? (
							<button type="button" onClick={onCreateCourse}>
								Create New Course
							</button>
						) : null}
					</div>
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
				<DropZone
					onFile={handleFileDrop}
					disabled={isUploading}
					hint={
						selectedFileName
							? `${selectedFileName} — uploading...`
							: undefined
					}
				/>
				{status !== "PDF, TXT, or MD" && status !== "Material queued for processing." && (
					<p>{status}</p>
				)}
				{materials.length > 0 ? (
					<ul>
						{materials.map((material) => (
							<li key={material.materialId}>
								<span>{material.fileName}</span>
								<span className={`status-badge status-${material.status}`}>
									{material.status}
								</span>
								{material.status === "uploaded" ||
								material.status === "failed" ? (
									<button
										type="button"
										className="btn-process"
										onClick={() => handleProcessMaterial(material.materialId)}
									>
										Process
									</button>
								) : null}
								<button
									type="button"
									className="btn-icon"
									aria-label={`Delete ${material.fileName}`}
									title="Remove material"
									onClick={() =>
										setDeleteModal({
											materialId: material.materialId,
											fileName: material.fileName,
										})
									}
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
				{readyMaterial?.summary ? (
					<>
						<p>{readyMaterial.summary}</p>
						<h3>Key concepts</h3>
						{readyMaterial.keyConcepts?.length ? (
							<ul>
								{readyMaterial.keyConcepts.map((concept) => (
									<li key={concept}>{concept}</li>
								))}
							</ul>
						) : null}
					</>
				) : (
					<EmptyState
						icon="brain"
						title="No summary yet"
						description="Upload a material and wait for processing to finish."
					/>
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
					<EmptyState
						icon="target"
						title="No tasks yet"
						description="Generate a study plan after at least one material is ready."
					/>
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

			<Modal
				isOpen={deleteModal !== null}
				onClose={() => setDeleteModal(null)}
				title="Remove material"
				confirmLabel="Remove"
				onConfirm={handleDeleteConfirm}
				variant="danger"
			>
				<p>
					Are you sure you want to remove <strong>{deleteModal?.fileName}</strong>?
					This cannot be undone.
				</p>
			</Modal>
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
