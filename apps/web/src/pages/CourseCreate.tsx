import { type FormEvent, useState } from "react";

interface CourseCreateProps {
	token: string;
	onCreate: (input: {
		name: string;
		examDate: string;
		difficulty: string;
		weeklyHoursAvailable: number;
	}) => Promise<void>;
	onCancel: () => void;
}

const difficultyOptions = [
	{ value: "easy", label: "Easy" },
	{ value: "medium", label: "Medium" },
	{ value: "hard", label: "Hard" },
];

export function CourseCreate({
	token: _token,
	onCreate,
	onCancel,
}: CourseCreateProps) {
	const [name, setName] = useState("");
	const [examDate, setExamDate] = useState(() => {
		const d = new Date(Date.now() + 30 * 864e5);
		return d.toISOString().slice(0, 10);
	});
	const [difficulty, setDifficulty] = useState("medium");
	const [weeklyHours, setWeeklyHours] = useState(10);
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setError("");
		setIsSubmitting(true);
		try {
			await onCreate({
				name: name.trim(),
				examDate,
				difficulty,
				weeklyHoursAvailable: weeklyHours,
			});
		} catch {
			setError("Could not create course. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="course-create-wrapper">
			<form className="panel course-create-panel" onSubmit={handleSubmit}>
				<h2>New course</h2>
				<p className="login-hint">
					Set up a course to start generating AI study plans.
				</p>

				<label>
					Course name
					<input
						type="text"
						name="name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder="e.g. Cloud Computing"
						autoFocus
					/>
				</label>

				<div className="form-row">
					<label>
						Exam date
						<input
							type="date"
							name="examDate"
							value={examDate}
							onChange={(event) => setExamDate(event.target.value)}
						/>
					</label>
					<label>
						Difficulty
						<select
							name="difficulty"
							value={difficulty}
							onChange={(event) => setDifficulty(event.target.value)}
						>
							{difficultyOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</label>
				</div>

				<label>
					Weekly study hours
					<div className="hours-input">
						<input
							type="range"
							name="weeklyHours"
							min="1"
							max="40"
							value={weeklyHours}
							onChange={(event) => setWeeklyHours(Number(event.target.value))}
						/>
						<span className="hours-value">{weeklyHours}h</span>
					</div>
				</label>

				{error ? <p role="alert">{error}</p> : null}

				<div className="form-actions">
					<button
						type="submit"
						disabled={isSubmitting || name.trim().length === 0}
					>
						{isSubmitting ? "Creating..." : "Create course"}
					</button>
					<button type="button" className="link-btn" onClick={onCancel}>
						Cancel
					</button>
				</div>
			</form>
		</div>
	);
}
