# Frontend Cognito Auth Integration Design

## Goal

Integrate the web frontend with the existing Cognito user pool so the UI can obtain a real JWT and call protected API Gateway routes with `Authorization: Bearer <token>`.

## Scope

- Use direct Cognito authentication from the React app, not Cognito Hosted UI or OAuth redirect.
- Authenticate with email and password against the existing Cognito app client.
- Store the authenticated session in frontend state and persist enough token data for page reloads during the demo.
- Attach the real token to API calls through the existing `apiRequest` helper.
- Replace at least one mock UI path with a real protected API call, starting with `GET /courses`.

## Configuration

The frontend will read Cognito and API settings from Vite environment variables:

- `VITE_API_BASE_URL`
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`
- `VITE_AWS_REGION`

The CDK stack already outputs the user pool id, app client id, API base URL, and region. Those outputs are the source values for local `.env` files or deployment configuration.

## Authentication Flow

The login form submits email and password to a small frontend auth module. That module uses Cognito Identity Provider `InitiateAuth` with the existing app client's direct password auth flow.

On success, the module returns:

- `idToken`, used as the bearer token for API Gateway's user pool authorizer.
- `accessToken`, retained for future user/profile operations if needed.
- `refreshToken`, retained for session continuity if Cognito returns one.

The app keeps the session in React state and mirrors it to `localStorage` for demo-friendly reload persistence. Logout clears state and storage.

## App Flow

If there is no valid stored session, the app shows the login page. After login succeeds, the app shows the current shell and pages.

The dashboard will call `GET /courses` with the authenticated token. While the call is pending, it shows a loading state. If the API rejects the token or the request fails, it shows a concise error state and keeps the user logged in so they can retry or log out.

## API Integration

The existing `apiRequest` helper already accepts a `token` option and adds the `Authorization` header. The implementation will keep that contract and add tests that prove the header contains the Cognito token.

The first protected route exercised from the UI is:

- `GET /courses`

Additional routes can reuse the same token plumbing without changing the auth module.

## Error Handling

Login errors are shown on the login form without exposing raw AWS error internals. Missing frontend config produces a clear client-side error so deployment mistakes are easy to diagnose.

Expired tokens are treated as request failures for this slice. Automatic refresh can be added later using the stored refresh token, but it is not required for the first working UI/API integration.

## Testing

Use TDD for implementation:

- Add tests for login form submission and authenticated app state.
- Add tests for `apiRequest` setting `Authorization: Bearer <token>`.
- Add tests for dashboard course loading through the authenticated client.

The implementation is complete when the focused frontend tests pass, typecheck passes, and the web build succeeds.
