import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	confirmRegistration,
	loginWithCognito,
	registerWithCognito,
} from "./cognito";

const send = vi.fn();

vi.mock("@aws-sdk/client-cognito-identity-provider", () => ({
	AuthFlowType: { USER_PASSWORD_AUTH: "USER_PASSWORD_AUTH" },
	CognitoIdentityProviderClient: vi.fn(() => ({ send })),
	ConfirmSignUpCommand: vi.fn((input) => ({ input })),
	InitiateAuthCommand: vi.fn((input) => ({ input })),
	SignUpCommand: vi.fn((input) => ({ input })),
}));

describe("auth", () => {
	beforeEach(() => {
		send.mockReset();
		vi.stubEnv("VITE_AWS_REGION", "us-east-1");
		vi.stubEnv("VITE_COGNITO_USER_POOL_CLIENT_ID", "client-1");
	});

	describe("registerWithCognito", () => {
		it("signs up a new user and returns delivery details", async () => {
			send.mockResolvedValueOnce({
				UserSub: "user-1",
				CodeDeliveryDetails: { Destination: "s***@e***" },
			});

			const result = await registerWithCognito("new@test.com", "Password123!");

			expect(result).toEqual({ userId: "user-1", destination: "s***@e***" });
		});
	});

	describe("confirmRegistration", () => {
		it("confirms the user with the code", async () => {
			send.mockResolvedValueOnce({});

			await expect(
				confirmRegistration("new@test.com", "123456"),
			).resolves.toBeUndefined();
		});
	});

	describe("loginWithCognito", () => {
		it("returns Cognito tokens for valid credentials", async () => {
			send.mockResolvedValueOnce({
				AuthenticationResult: {
					IdToken: "id-token-1",
					AccessToken: "access-token-1",
					RefreshToken: "refresh-token-1",
				},
			});

			const session = await loginWithCognito(
				"student@example.com",
				"Password123!",
			);

			expect(session).toEqual({
				idToken: "id-token-1",
				accessToken: "access-token-1",
				refreshToken: "refresh-token-1",
			});
		});

		it("throws a friendly error when Cognito does not return tokens", async () => {
			send.mockResolvedValueOnce({ AuthenticationResult: {} });

			await expect(
				loginWithCognito("student@example.com", "Password123!"),
			).rejects.toThrow("Sign in did not return a valid session.");
		});
	});
});
