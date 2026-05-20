# Demo Readiness To-Do

Goal: prepare a real cloud-deployed end-to-end demo for AI Study Planner.

Target demo flow:

1. Student registers/logs in with Cognito.
2. Student creates a course.
3. Student uploads a short demo PDF.
4. S3/SQS/Lambda processes the PDF through real Gemini.
5. Student sees AI summary and key concepts.
6. Student generates a study plan.
7. Study plan includes at least one task due today.
8. Student marks one task as done.
9. Student triggers reminders manually through the app.
10. SNS sends a live reminder email notification.

Decisions:

- AWS region: `us-east-1`.
- Backend deploy: manual local CDK deploy.
- Frontend hosting: AWS Amplify Hosting, configured manually for first demo.
- Frontend auth: AWS Amplify JS Auth with real Cognito.
- Gemini: real Gemini required, no mock as primary demo path.
- Demo material: short custom PDF, 1-2 pages.
- Reminder demo: EventBridge remains, plus protected manual endpoint.
- Manual reminder scope: authenticated user's due tasks only.
- Email reminders: SNS email subscription to the demo student address.
- Frontend redesign: premium redesign after backend cloud validation.
- Frontend env vars: configured manually in Amplify Console from CDK outputs.

## Milestone 1: AWS Account Is Ready

Done when: local commands can deploy CDK resources into `us-east-1`, and required external secrets/email identities exist.

Current status: AWS CLI v2 is installed, default region is set, and local credentials resolve to AWS account `381492031643`.
Current status: standard CDK bootstrap cannot be used because the VocLabs role cannot perform `iam:CreateRole`. A VocLabs-compatible deploy path is being used instead: CDK reuses `LabRole` and publishes assets to the new dedicated bucket `ai-study-planner-cdk-assets-381492031643-us-east-1`. `AiStudyPlannerStack` is deployed in `us-east-1`.
Current SES decision: SES is blocked for `LabRole`, so live email reminders use SNS email subscription instead.
Current SNS status: the email subscription is confirmed, a direct SNS publish test succeeded, and the test email arrived in the demo inbox.

- [x] Configure AWS CLI credentials locally.
- [x] Set default region to `us-east-1`.
- [x] Confirm caller identity with `aws sts get-caller-identity`.
- [x] Run CDK bootstrap for `us-east-1`, or replace it with a VocLabs-compatible deploy path.
- [x] Create Secrets Manager secret named `gemini-api-key`.
- [x] Store the real Gemini API key in that secret.
- [x] Confirm SNS email subscription for the demo email address.

Verification:

```powershell
aws sts get-caller-identity
aws secretsmanager describe-secret --secret-id gemini-api-key --region us-east-1
aws ses get-identity-verification-attributes --identities <demo-email> --region us-east-1
```

## Milestone 2: Backend Deploy Outputs Are Explicit

Done when: `cdk deploy` prints all values needed by frontend and demo setup.

- [x] Add CDK outputs for API Gateway URL.
- [x] Add CDK outputs for Cognito User Pool ID.
- [x] Add CDK outputs for Cognito App Client ID.
- [x] Add CDK output for AWS region.
- [x] Add CDK output for materials S3 bucket name.
- [x] Add CDK output for Gemini secret name.
- [x] Replace hardcoded `verified@example.com` with configurable sender email.
- [x] Add CDK parameter/context/env support for reminder sender email.

Verification:

```powershell
npm run typecheck
npm run build
npm run cdk:synth
```

## Milestone 3: Backend Cloud Deploy Works

Done when: CDK deploy succeeds and deployed AWS resources exist in `us-east-1`.

- [x] Run `npm run build`.
- [x] Run `npm run cdk:synth`.
- [x] Deploy stack with CDK into `us-east-1`.
- [x] Save deploy outputs for frontend configuration.
- [x] Confirm Cognito User Pool and App Client exist.
- [x] Confirm API Gateway routes exist and require JWT.
- [x] Confirm DynamoDB tables exist.
- [x] Confirm S3 bucket and SQS queue exist.
- [x] Confirm EventBridge rule exists.
- [x] Confirm Lambda functions are deployed.

Deploy outputs:

- `VITE_API_BASE_URL=https://nv414bjgp8.execute-api.us-east-1.amazonaws.com`
- `VITE_AWS_REGION=us-east-1`
- `VITE_COGNITO_USER_POOL_ID=us-east-1_nXeom8n79`
- `VITE_COGNITO_USER_POOL_CLIENT_ID=7u53kk3qhbrmtsomvv7032nrgo`
- `MaterialsBucketName=aistudyplannerstack-materialsbucket6ac7bab9-rzvspwecsawx`
- `GeminiSecretName=gemini-api-key`

Verification:

```powershell
npm run build
npm run cdk:synth
npm --workspace infra run synth
cd infra
npx cdk deploy --region us-east-1
```

## Milestone 4: Backend API Supports Full Demo Flow

Done when: every demo action has a real API path and data can be retrieved by the frontend.

Current status: protected `POST /reminders/run` is deployed in API Gateway with JWT authorization and runs reminders only for the authenticated user.
Current status: read endpoints exist for course materials, course study tasks, and authenticated user notifications.
Current status: protected `POST /materials/{materialId}/process` queues an uploaded material into SQS for the existing processor Lambda, replacing S3 bucket notifications for VocLabs compatibility.
Current status: the frontend course workspace can call the real study-plan and study-task APIs after a material is ready.

- [x] Add endpoint to list course materials and processing status.
- [x] Add endpoint to list study tasks for a course.
- [x] Add endpoint or data shape for dashboard: courses, today's tasks, deadlines, summaries, notifications.
- [x] Add endpoint to list notifications.
- [x] Add protected `POST /reminders/run`.
- [x] Ensure `POST /reminders/run` sends reminders only for authenticated user's due tasks.
- [ ] Keep scheduled EventBridge reminder worker for all due tasks.
- [x] Ensure study-plan prompt asks Gemini for at least one task dated today for demo viability.
- [x] Ensure generated tasks persist with `userId`, `courseId`, `planId`, date, title, description, estimated minutes, and status.
- [x] Ensure upload/material processing stores enough data for UI status polling.
- [ ] Ensure handlers return useful error messages for frontend display.

Verification:

```powershell
npm test
npm run typecheck
```

## Milestone 5: Real Gemini PDF Processing Is Verified

Done when: the deployed processor Lambda processes the demo PDF through Gemini and stores summary/key concepts in DynamoDB.

- [ ] Create short 1-2 page demo PDF about cloud/serverless study material.
- [ ] Upload the PDF through the API-generated presigned URL.
- [ ] Confirm S3 object is created.
- [ ] Confirm SQS message is consumed.
- [ ] Confirm Processor Lambda logs show Gemini call success.
- [ ] Confirm material status changes from `uploaded` to `processing` to `ready`.
- [ ] Confirm DynamoDB material item has `summary` and `keyConcepts`.
- [ ] Measure processing time for presentation expectations.

Verification:

```powershell
aws logs tail /aws/lambda/<process-material-lambda-name> --follow --region us-east-1
```

## Milestone 6: SNS Reminder Email Works Live

Done when: a due task for the demo user triggers a real SNS email notification to the confirmed demo address.

Current status: SES is intentionally replaced with SNS because AWS denies SES send and SES verification/quota read actions for `LabRole`.
Current status: SNS topic and email subscription are deployed. The subscription is confirmed, a direct SNS publish test succeeded, and the test email arrived in the demo inbox.

- [ ] Ensure Cognito/demo user identity can be associated with an email address.
- [x] Fix reminder publisher so recipient email is not assumed to be raw `userId`.
- [x] Publish reminders to SNS topic instead of SES.
- [x] Confirm SNS email subscription.
- [ ] Create or generate at least one task due today.
- [ ] Trigger reminder through `POST /reminders/run`.
- [ ] Confirm notification row is created.
- [ ] Confirm task gets `reminderSentAt`.
- [x] Confirm SNS email notification arrives in inbox.

Verification:

```powershell
aws logs tail /aws/lambda/<send-reminders-lambda-name> --follow --region us-east-1
```

## Milestone 7: Frontend Auth And API Integration Works

Done when: the web app uses real Cognito auth and sends JWTs to API Gateway.

- [ ] Add AWS Amplify JS dependency.
- [ ] Configure Amplify from environment variables.
- [ ] Add register flow.
- [ ] Add login flow.
- [ ] Add logout flow.
- [ ] Persist authenticated session.
- [ ] Read ID/access token for API calls.
- [ ] Update API client to attach Cognito JWT.
- [ ] Add authenticated/unauthenticated app states.
- [ ] Show API errors clearly.

Required Amplify env vars:

- [ ] `VITE_API_BASE_URL`
- [ ] `VITE_AWS_REGION`
- [ ] `VITE_COGNITO_USER_POOL_ID`
- [ ] `VITE_COGNITO_USER_POOL_CLIENT_ID`

Verification:

```powershell
npm --workspace apps/web run test
npm --workspace apps/web run build
```

## Milestone 8: Premium Frontend Redesign Is Complete

Done when: the frontend looks presentation-ready and still completes the real cloud flow.

Current status: dashboard panels now load real data from protected `GET /dashboard` instead of static placeholder arrays.
Current status: course workspace loads real courses, uploads material files through presigned URLs, queues SQS processing, and displays material processing status.
Current status: course workspace displays ready material summaries/key concepts, generates study plans, lists course tasks, and updates task status through the API client.

- [ ] Redesign login/register screen.
- [ ] Redesign dashboard with real data sections.
- [ ] Redesign course creation flow.
- [ ] Redesign course workspace.
- [x] Add material upload progress and status states.
- [x] Add processing/ready/failed material UI.
- [x] Add AI summary and key concepts UI.
- [x] Add generate study plan action and loading state.
- [x] Add study task list with status controls.
- [ ] Add manual reminder trigger UI.
- [ ] Add notifications/reminder status UI.
- [ ] Add empty states.
- [ ] Add error states.
- [ ] Add responsive desktop/mobile layout.
- [ ] Keep UI focused on the demo flow, despite premium polish.

Verification:

```powershell
npm --workspace apps/web run test
npm --workspace apps/web run build
```

## Milestone 9: Amplify Hosting Is Live

Done when: the React app is reachable through an Amplify URL and talks to deployed AWS backend.

- [ ] Create Amplify app manually.
- [ ] Connect repository/branch.
- [ ] Configure build command for Vite workspace.
- [ ] Set frontend env vars from CDK outputs.
- [ ] Deploy frontend.
- [ ] Confirm app loads from Amplify URL.
- [ ] Confirm register/login works from hosted URL.
- [ ] Confirm CORS/API calls work from hosted URL.
- [ ] Confirm full demo flow works from hosted URL.

Verification:

```text
Open Amplify URL and run the full target demo flow.
```

## Milestone 10: End-To-End Demo Rehearsal Passes

Done when: the entire demo can be completed twice in a row without code changes.

- [ ] Start from clean browser session.
- [ ] Register or log in as demo student.
- [ ] Create demo course.
- [ ] Upload short PDF.
- [ ] Wait for Gemini processing to complete.
- [ ] Show summary/key concepts.
- [ ] Generate study plan.
- [ ] Confirm at least one task is due today.
- [ ] Mark one task as done.
- [ ] Trigger manual reminder.
- [ ] Confirm notification appears.
- [ ] Confirm email arrives.
- [ ] Record exact expected wait times.
- [ ] Note any AWS Console pages needed as backup evidence.

Verification:

```text
Run the complete demo twice using the deployed Amplify URL.
```

## Later: Presentation And Documentation

Do this after the app works.

- [ ] Update architecture diagram if implementation differs from current docs.
- [ ] Prepare demo script.
- [ ] Prepare cloud services explanation mapped to project rubric.
- [ ] Prepare backup screenshots.
- [ ] Prepare failure fallback explanation for Gemini/SNS latency.
- [ ] Confirm cost cleanup plan after presentation.
