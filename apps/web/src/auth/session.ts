export interface AuthSession {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

const storageKey = "ai-study-planner.auth";

export function loadStoredSession(): AuthSession | null {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as Partial<AuthSession>;
    if (typeof parsed.idToken !== "string" || parsed.idToken.length === 0) return null;
    if (typeof parsed.accessToken !== "string" || parsed.accessToken.length === 0) return null;
    if (parsed.refreshToken !== undefined && typeof parsed.refreshToken !== "string") return null;
    if (typeof parsed.expiresAt !== "number") {
      clearStoredSession();
      return null;
    }
    if (parsed.expiresAt <= Date.now()) {
      clearStoredSession();
      return null;
    }
    return {
      idToken: parsed.idToken,
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt
    };
  } catch {
    return null;
  }
}

export function saveStoredSession(session: AuthSession): void {
  localStorage.setItem(storageKey, JSON.stringify(session));
}

export function clearStoredSession(): void {
  localStorage.removeItem(storageKey);
}
