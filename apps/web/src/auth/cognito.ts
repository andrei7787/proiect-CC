import {
  AuthFlowType,
  CognitoIdentityProviderClient,
  InitiateAuthCommand
} from "@aws-sdk/client-cognito-identity-provider";
import type { AuthSession } from "./session";

function requiredEnv(name: string): string {
  const value = import.meta.env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export async function loginWithCognito(email: string, password: string): Promise<AuthSession> {
  const client = new CognitoIdentityProviderClient({
    region: requiredEnv("VITE_AWS_REGION")
  });

  const result = await client.send(new InitiateAuthCommand({
    AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
    ClientId: requiredEnv("VITE_COGNITO_USER_POOL_CLIENT_ID"),
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password
    }
  }));

  const auth = result.AuthenticationResult;
  if (!auth?.IdToken || !auth.AccessToken) {
    throw new Error("Sign in did not return a valid session.");
  }

  return {
    idToken: auth.IdToken,
    accessToken: auth.AccessToken,
    refreshToken: auth.RefreshToken
  };
}
