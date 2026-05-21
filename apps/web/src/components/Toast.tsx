import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from "react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
	id: number;
	message: string;
	type: ToastType;
	leaving?: boolean;
}

interface ToastContextValue {
	toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

const AUTO_DISMISS_MS: Record<ToastType, number> = {
	success: 4000,
	error: 6000,
	info: 6000,
};

export function useToast(): ToastContextValue {
	const ctx = useContext(ToastContext);
	if (!ctx) {
		throw new Error("useToast must be used within a ToastProvider");
	}
	return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);
	const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

	const removeToast = useCallback((id: number) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const dismissToast = useCallback(
		(id: number) => {
			// Start leave animation
			setToasts((prev) =>
				prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
			);
			// Remove after animation completes
			setTimeout(() => removeToast(id), 300);
		},
		[removeToast],
	);

	const toast = useCallback(
		(message: string, type: ToastType = "info") => {
			const id = nextId++;
			const newToast: Toast = { id, message, type };

			setToasts((prev) => [...prev, newToast]);

			const timer = setTimeout(() => dismissToast(id), AUTO_DISMISS_MS[type]);
			timersRef.current.set(id, timer);
		},
		[dismissToast],
	);

	// Clear timers on unmount
	useEffect(() => {
		const timers = timersRef.current;
		return () => {
			for (const timer of timers.values()) {
				clearTimeout(timer);
			}
			timers.clear();
		};
	}, []);

	return (
		<ToastContext.Provider value={{ toast }}>
			{children}
			<div className="toast-container" aria-live="polite" role="status">
				{toasts.map((t) => (
					<div
						key={t.id}
						className={`toast toast--${t.type}${t.leaving ? " toast--leaving" : ""}`}
						role="status"
					>
						<span className="toast__icon" aria-hidden="true">
							{t.type === "success" && "✓"}
							{t.type === "error" && "✕"}
							{t.type === "info" && "ℹ"}
						</span>
						<span className="toast__message">{t.message}</span>
						<button
							type="button"
							className="toast__dismiss"
							onClick={() => dismissToast(t.id)}
							aria-label="Dismiss"
						>
							×
						</button>
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
}
