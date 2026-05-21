import { type FormEvent, useState } from "react";

type Mode = "login" | "register" | "confirm";

interface LoginProps {
	error?: string;
	isSubmitting?: boolean;
	onLogin: (email: string, password: string) => Promise<void>;
	onRegister: (email: string, password: string) => Promise<string | undefined>;
	onConfirm: (email: string, code: string) => Promise<void>;
}

export function Login({
	error,
	isSubmitting = false,
	onLogin,
	onRegister,
	onConfirm,
}: LoginProps) {
	const [mode, setMode] = useState<Mode>("login");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [code, setCode] = useState("");
	const [localError, setLocalError] = useState("");
	const [localSubmitting, setLocalSubmitting] = useState(false);
	const [registerDest, setRegisterDest] = useState("");

	const displayError = localError || error;
	const isDisabled = localSubmitting || isSubmitting;

	async function handleLogin(event: FormEvent) {
		event.preventDefault();
		setLocalError("");
		setLocalSubmitting(true);
		try {
			await onLogin(email, password);
		} catch {
			setLocalError("Sign in failed. Check your email and password.");
		} finally {
			setLocalSubmitting(false);
		}
	}

	async function handleRegister(event: FormEvent) {
		event.preventDefault();
		setLocalError("");
		setLocalSubmitting(true);
		try {
			const dest = await onRegister(email, password);
			if (dest) {
				setRegisterDest(dest);
				setCode("");
				setMode("confirm");
			}
		} catch {
			setLocalError("Registration failed. Try a different email.");
		} finally {
			setLocalSubmitting(false);
		}
	}

	async function handleConfirm(event: FormEvent) {
		event.preventDefault();
		setLocalError("");
		setLocalSubmitting(true);
		try {
			await onConfirm(email, code);
			await onLogin(email, password);
		} catch {
			setLocalError("Invalid confirmation code.");
		} finally {
			setLocalSubmitting(false);
		}
	}

	if (mode === "confirm") {
		return (
			<form className="panel login-panel" onSubmit={handleConfirm}>
				<h2>Check your email</h2>
				<p className="login-hint">
					A confirmation code was sent to <strong>{registerDest}</strong>. Enter
					it below to activate your account.
				</p>
				<label>
					Confirmation code
					<input
						type="text"
						name="code"
						autoComplete="one-time-code"
						value={code}
						onChange={(event) => setCode(event.target.value)}
						placeholder="000000"
						autoFocus
					/>
				</label>
				{displayError ? <p role="alert">{displayError}</p> : null}
				<button type="submit" disabled={isDisabled || code.length === 0}>
					{localSubmitting ? "Confirming..." : "Activate account"}
				</button>
				<button
					type="button"
					className="link-btn"
					onClick={() => {
						setMode("register");
						setLocalError("");
					}}
				>
					← Back
				</button>
			</form>
		);
	}

	if (mode === "register") {
		return (
			<form className="panel login-panel" onSubmit={handleRegister}>
				<h2>Create account</h2>
				<p className="login-hint">Start your AI-powered study journey.</p>
				<label>
					Email
					<input
						type="email"
						name="email"
						autoComplete="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						placeholder="student@example.com"
					/>
				</label>
				<label>
					Password
					<input
						type="password"
						name="password"
						autoComplete="new-password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						placeholder="At least 8 characters"
					/>
				</label>
				{displayError ? <p role="alert">{displayError}</p> : null}
				<button
					type="submit"
					disabled={isDisabled || !email || password.length < 8}
				>
					{localSubmitting ? "Creating account..." : "Create account"}
				</button>
				<button
					type="button"
					className="link-btn"
					onClick={() => {
						setMode("login");
						setLocalError("");
					}}
				>
					Already have an account? Sign in
				</button>
			</form>
		);
	}

	return (
		<form className="panel login-panel" onSubmit={handleLogin}>
			<h2>Welcome back</h2>
			<p className="login-hint">Sign in to continue your studies.</p>
			<label>
				Email
				<input
					type="email"
					name="email"
					autoComplete="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					placeholder="student@example.com"
				/>
			</label>
			<label>
				Password
				<input
					type="password"
					name="password"
					autoComplete="current-password"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
				/>
			</label>
			{displayError ? <p role="alert">{displayError}</p> : null}
			<button type="submit" disabled={isDisabled}>
				{localSubmitting ? "Signing in..." : "Continue"}
			</button>
			<button
				type="button"
				className="link-btn"
				onClick={() => {
					setMode("register");
					setLocalError("");
				}}
			>
				New student? Create an account
			</button>
		</form>
	);
}
