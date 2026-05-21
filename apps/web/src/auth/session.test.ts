import { afterEach, describe, expect, it } from "vitest";
import { clearStoredSession, loadStoredSession, saveStoredSession, type AuthSession } from "./session";

const session: AuthSession = {
  idToken: "id-token-1",
  accessToken: "access-token-1",
  refreshToken: "refresh-token-1"
};

describe("session storage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("saves and loads a valid auth session", () => {
    saveStoredSession(session);

    expect(loadStoredSession()).toEqual(session);
  });

  it("returns null when stored data is malformed", () => {
    localStorage.setItem("ai-study-planner.auth", JSON.stringify({ idToken: "" }));

    expect(loadStoredSession()).toBeNull();
  });

  it("clears the stored session", () => {
    saveStoredSession(session);

    clearStoredSession();

    expect(loadStoredSession()).toBeNull();
  });
});
