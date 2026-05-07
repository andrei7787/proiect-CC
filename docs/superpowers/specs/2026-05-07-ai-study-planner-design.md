# AI Study Planner Design

## Source Requirements

The project follows the cloud computing specification in `Project specifications.pdf`.
The required deliverables are:

- Functional web or mobile UI hosted in the cloud.
- API layer connected to backend compute.
- Managed database or storage layer.
- At least six distinct cloud services.
- At least one advanced component from identity, DevOps, AI/ML, or event-driven architecture.
- Detailed Cloud Architecture / UML diagram for the final presentation.

## Product Scope

AI Study Planner is a student-facing web application for individual university students.
Students create courses, upload study materials, receive AI-generated summaries and key concepts, then generate a study plan with dated tasks before an exam.

The MVP is planner-first, not chatbot-first. The dashboard focuses on today's tasks, active courses, upcoming deadlines, recent summaries, and reminders.

Out of scope for the MVP:

- Teacher/admin workflows.
- Multi-student collaboration.
- Full university timetable management.
- Grade tracking.
- Social login.
- Containerized or EC2-based backend hosting.
- Amazon Bedrock and Amazon Textract.

## Architecture Decision

The approved architecture is a multi-cloud design:

- AWS serverless application infrastructure.
- Google Gemini API for generative AI.
- Model: `gemini-2.5-flash-lite`.

AWS remains the primary platform for hosting, identity, API, backend, data, files, async processing, notifications, secrets, and deployment. Gemini is the external AI service used for direct document analysis, summaries, key concepts, and study plan generation.

## Cloud Services

The design uses these distinct cloud services:

- AWS Amplify Hosting for the React frontend.
- Amazon Cognito for user authentication.
- Amazon API Gateway for the API layer.
- AWS Lambda for backend compute.
- Amazon DynamoDB for application data.
- Amazon S3 for uploaded materials.
- Amazon SQS for asynchronous material processing.
- Amazon EventBridge Scheduler for reminder jobs.
- Amazon SES for email reminders.
- AWS Secrets Manager for the Gemini API key.
- AWS IAM for service permissions.
- Google Gemini API with `gemini-2.5-flash-lite` for AI.

This satisfies the six-service requirement and includes advanced components in identity, DevOps, AI/ML, and event-driven architecture.

## Frontend

Stack:

- React.
- TypeScript.
- Vite.
- AWS Amplify Hosting.

Main screens:

- Login and register.
- Dashboard.
- Course detail.
- Upload material.
- AI summary and key concepts.
- Study plan and task status.
- Notifications/reminders.

The frontend authenticates through Cognito and sends the Cognito JWT to API Gateway for protected requests.

## Backend Components

### Auth Layer

Amazon Cognito User Pool handles email/password registration and login. API Gateway validates JWTs using a Cognito authorizer.

### Course API

Lambda endpoints manage course creation, updates, reads, and deletion. Course data is stored in DynamoDB.

### Material API

Lambda endpoints create S3 signed upload URLs, create material records, and expose material processing status and generated AI outputs.

### Material Processor

S3 emits an event after upload. The event is routed to SQS. A Processor Lambda consumes the queue, reads the uploaded PDF/TXT/MD file from S3, calls Gemini 2.5 Flash-Lite, and saves summary/key concepts/status updates in DynamoDB.

PDFs are sent directly to Gemini. Amazon Textract is intentionally not used in the final design.

### Study Plan API

The student manually triggers study plan generation after a material is ready. Lambda sends course metadata, deadline, difficulty, available study hours, and material insights to Gemini. Gemini returns a structured plan. Lambda stores the plan and dated tasks in DynamoDB.

### Reminder Worker

EventBridge Scheduler periodically invokes a Lambda worker. The worker queries due study tasks, creates in-app notifications in DynamoDB, and sends email reminders through Amazon SES.

### Infrastructure And CI/CD

AWS CDK with TypeScript defines cloud infrastructure. GitHub Actions runs build/test steps and deploys infrastructure through CDK. Amplify hosts and deploys the frontend.

## Data Model

The design uses separate DynamoDB tables for clarity during implementation and presentation.

### Users/Profile

- `userId`
- `email`
- `displayName`
- `createdAt`

### Courses

- `courseId`
- `userId`
- `name`
- `examDate`
- `difficulty`
- `weeklyHoursAvailable`
- `createdAt`
- `updatedAt`

### Materials

- `materialId`
- `courseId`
- `userId`
- `fileName`
- `s3Key`
- `contentType`
- `status`
- `summary`
- `keyConcepts`
- `createdAt`
- `processedAt`
- `errorMessage`

Valid material statuses:

- `uploaded`
- `processing`
- `ready`
- `failed`

### StudyPlans

- `planId`
- `courseId`
- `userId`
- `generatedFromMaterialIds`
- `startDate`
- `examDate`
- `createdAt`

### StudyTasks

- `taskId`
- `planId`
- `courseId`
- `userId`
- `date`
- `title`
- `description`
- `estimatedMinutes`
- `status`
- `reminderSentAt`

Valid task statuses:

- `todo`
- `done`
- `skipped`

### Notifications

- `notificationId`
- `userId`
- `taskId`
- `type`
- `message`
- `status`
- `createdAt`
- `sentAt`

## Main Flows

### 1. Login

The student logs in through Cognito. The frontend receives a JWT and uses it for API calls.

### 2. Course Setup

The student creates a course with name, exam date, difficulty, and weekly available study hours. The Course API stores it in DynamoDB.

### 3. Material Upload And AI Summary

The frontend requests a signed upload URL. The Material API creates a material record and returns the URL. The frontend uploads the file to S3. S3 emits an event to SQS. Processor Lambda consumes the message, reads the S3 object, sends it to Gemini, then saves summary, key concepts, and status `ready` in DynamoDB.

If Gemini processing fails, the material is marked `failed` and the error is recorded.

### 4. Study Plan Generation

The student clicks Generate Study Plan after material processing completes. Lambda calls Gemini with course settings and material insights. Gemini returns structured tasks by date. Lambda stores the plan and tasks in DynamoDB.

### 5. Reminders

EventBridge Scheduler invokes Reminder Worker. The worker finds due tasks, writes notifications, sends emails through SES, and sets `reminderSentAt` to avoid duplicates.

## Gemini Integration

Gemini model code: `gemini-2.5-flash-lite`.

Gemini is used for:

- Direct PDF/TXT/MD material analysis.
- Summary generation.
- Key concept extraction.
- Study plan generation.

The Gemini API key is stored in AWS Secrets Manager and read only by the Lambdas that need it. Lambda calls Gemini over HTTPS.

Expected structured AI outputs:

- `summary`: short summary text.
- `keyConcepts`: array of important concepts.
- `recommendedFocusAreas`: array of focus areas.
- `studyTasks`: array of dated tasks for study plan generation.

## Error Handling

- Failed upload: frontend shows upload failure and no material record is marked ready.
- Failed SQS processing: message can be retried; after repeated failure, material status becomes `failed`.
- Gemini failure: Lambda records `errorMessage` and keeps the material or plan generation in failed state.
- Unauthorized API call: API Gateway rejects missing or invalid JWT.
- Reminder email failure: notification remains in DynamoDB with failed email status, while in-app notification still exists.

## Security

- Cognito protects user identity.
- API Gateway authorizer validates JWTs.
- Lambda uses IAM roles with least privilege.
- S3 bucket is private; uploads use signed URLs.
- DynamoDB records include `userId` and APIs enforce ownership checks.
- Gemini API key is stored in Secrets Manager, not in frontend code or environment files committed to git.

## Testing Strategy

Recommended tests:

- Frontend form validation and dashboard rendering.
- API unit tests for course/material/task handlers.
- Authorization tests for user-owned records.
- Processor Lambda tests with mocked S3, SQS, and Gemini responses.
- Study plan generation tests with mocked Gemini structured output.
- Reminder worker tests for due tasks, duplicate prevention, and SES failure.
- Infrastructure synthesis check with CDK.

## Presentation Demo Script

1. Register/login as a student.
2. Create a course with an exam date and difficulty.
3. Upload a PDF material.
4. Show the material status moving from uploaded/processing to ready.
5. Show Gemini-generated summary and key concepts.
6. Click Generate Study Plan.
7. Show generated tasks on the dashboard.
8. Mark a task as done.
9. Show reminder notification/email flow.
10. Present the Cloud Architecture / UML diagram and map each service to the rubric.

## Architecture Diagram Content

The final diagram should show:

- Student Browser to Amplify.
- Amplify to Cognito for auth.
- Amplify to API Gateway with JWT.
- API Gateway to Lambda.
- Lambda to DynamoDB.
- Lambda to S3 signed upload URL.
- S3 event to SQS.
- SQS to Processor Lambda.
- Processor Lambda to S3, Secrets Manager, Gemini API, and DynamoDB.
- EventBridge Scheduler to Reminder Lambda.
- Reminder Lambda to DynamoDB and SES.
- GitHub Actions to AWS CDK deployment.

## Open Implementation Assumptions

- SES may require verified sender/recipient emails during demo.
- Gemini billing/API access must be configured before live AI calls.
- A deterministic mock Gemini response can be used only as a demo fallback if external API access fails.
- The architecture remains valid even if the fallback is used during presentation, as long as the intended Gemini integration is shown.

## Implementation Artifacts

- Monorepo packages: `apps/web`, `apps/api`, `packages/shared`, `infra`.
- Backend handlers cover courses, material uploads, material processing, study plan generation, task status updates, and reminders.
- CDK stack defines Cognito, API Gateway, Lambda, DynamoDB, S3, SQS, EventBridge, SES permissions, and Secrets Manager access.
- Architecture diagram is stored at `docs/architecture/ai-study-planner.mmd`.
- CI workflow is stored at `.github/workflows/ci.yml`.
