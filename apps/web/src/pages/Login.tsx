import { type FormEvent, useState } from "react";

interface LoginProps {
  error?: string;
  isSubmitting?: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
}

export function Login({ error, isSubmitting = false, onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onLogin(email, password);
  }

  return (
    <form className="panel login-panel" onSubmit={handleSubmit}>
      <h2>Student login</h2>
      <label>
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Continue"}
      </button>
    </form>
  );
}
