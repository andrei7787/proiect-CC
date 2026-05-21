#!/usr/bin/env node
/**
 * End-to-end demo script for AI Study Planner.
 *
 * Prerequisites:
 *   1. Backend stack deployed via CDK (Milestone 3).
 *   2. Node.js >= 22 with fetch available.
 *
 * Usage:
 *   node scripts/e2e-demo.mjs [--email <email>] [--password <password>]
 *
 * If no credentials are provided, the script creates a new Cognito user.
 * A confirmation code will be sent to the email address; enter it when prompted.
 *
 * The script runs the full target demo flow:
 *   1.  Register or log in
 *   2.  Create a course
 *   3.  Upload the demo PDF
 *   4.  Queue processing
 *   5.  Poll until material is ready
 *   6.  Display AI summary and key concepts
 *   7.  Generate study plan
 *   8.  Mark one task as done
 *   9.  Trigger manual reminders
 */

const API_BASE = process.env.E2E_API_BASE || "https://nv414bjgp8.execute-api.us-east-1.amazonaws.com";
const REGION = process.env.AWS_REGION || "us-east-1";
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || "us-east-1_nXeom8n79";
const CLIENT_ID = process.env.COGNITO_USER_POOL_CLIENT_ID || "7u53kk3qhbrmtsomvv7032nrgo";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { email: "", password: "" };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && args[i + 1]) opts.email = args[++i];
    else if (args[i] === "--password" && args[i + 1]) opts.password = args[++i];
  }
  return opts;
}

async function main() {
  const startTime = Date.now();
  const opts = parseArgs();
  console.log("AI Study Planner — E2E Demo Script\n");

  // ── Step 1: Auth ─────────────────────────────────────────────
  let idToken;
  if (opts.email && opts.password) {
    console.log(`[1/9] Logging in as ${opts.email}...`);
    idToken = await login(opts.email, opts.password);
  } else {
    const email = `demo-${Date.now()}@example.com`;
    const password = "DemoTest123!";
    console.log(`[1/9] Signing up new user ${email}...`);
    await signUp(email, password);
    const code = await prompt("Enter the confirmation code from your email: ");
    await confirmSignUp(email, code);
    idToken = await login(email, password);
  }
  console.log("  ✓ Authenticated\n");

  // ── Step 2: Create course ────────────────────────────────────
  console.log("[2/9] Creating demo course...");
  const course = await apiPost("/courses", idToken, {
    name: "Cloud Computing",
    examDate: new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10),
    difficulty: "medium",
    weeklyHoursAvailable: 10
  });
  console.log(`  ✓ Course created: ${course.name} (${course.courseId})\n`);

  // ── Step 3: Upload demo PDF ──────────────────────────────────
  console.log("[3/9] Uploading demo PDF...");
  const { readFileSync } = await import("node:fs");
  const demoPdfPath = new URL("../docs/demo-material.pdf", import.meta.url).pathname;
  const pdfBytes = readFileSync(demoPdfPath);
  const upload = await apiPost("/materials/upload", idToken, {
    courseId: course.courseId,
    fileName: "cloud-serverless-guide.pdf",
    contentType: "application/pdf"
  });
  const putResponse = await fetch(upload.uploadUrl, {
    method: "PUT",
    body: pdfBytes,
    headers: { "Content-Type": "application/pdf" }
  });
  if (!putResponse.ok) throw new Error(`Upload PUT failed: ${putResponse.status}`);
  console.log(`  ✓ PDF uploaded (${(pdfBytes.length / 1024).toFixed(1)} KB)\n`);

  // ── Step 4: Queue processing ─────────────────────────────────
  console.log("[4/9] Queuing material for Gemini processing...");
  const materialId = upload.material.materialId;
  const queueResult = await apiPost(`/materials/${materialId}/process`, idToken, {});
  console.log(`  ✓ Queued: ${queueResult.queued}\n`);

  // ── Step 5: Poll until ready ─────────────────────────────────
  console.log("[5/9] Waiting for Gemini processing...");
  const material = await pollUntilReady(course.courseId, materialId, idToken);
  const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  ✓ Material ready (${processingTime}s)\n`);

  // ── Step 6: Show AI summary ──────────────────────────────────
  console.log("[6/9] AI Summary and Key Concepts:");
  console.log(`  Summary: ${material.summary?.slice(0, 200)}...`);
  console.log(`  Key Concepts: ${material.keyConcepts?.join(", ")}\n`);

  // ── Step 7: Generate study plan ──────────────────────────────
  console.log("[7/9] Generating study plan...");
  const plan = await apiPost("/study-plans", idToken, {
    courseId: course.courseId
  });
  const tasks = await apiGet(`/courses/${course.courseId}/tasks`, idToken);
  console.log(`  ✓ Plan generated with ${tasks.length} tasks`);
  const todayTask = tasks.find((t) => t.date === new Date().toISOString().slice(0, 10));
  if (todayTask) {
    console.log(`  ✓ Task due today: "${todayTask.title}"\n`);
  } else {
    console.log("  ⚠ No task due today — study plan prompt may need adjustment\n");
  }

  // ── Step 8: Mark task done ───────────────────────────────────
  if (todayTask) {
    console.log(`[8/9] Marking task "${todayTask.title}" as done...`);
    await apiPatch(`/study-tasks/${todayTask.taskId}`, idToken, { status: "done" });
    console.log("  ✓ Task marked done\n");
  } else {
    console.log("[8/9] Skipped — no task due today\n");
  }

  // ── Step 9: Trigger reminders ────────────────────────────────
  console.log("[9/9] Triggering manual reminders...");
  const reminderResult = await apiPost("/reminders/run", idToken, {});
  console.log(`  ✓ ${reminderResult.sent} reminder(s) sent`);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Demo completed in ${totalTime}s`);
  console.log("Check your email for the SNS reminder notification.");
}

// ── Cognito helpers ─────────────────────────────────────────────

async function signUp(email, password) {
  const { CognitoIdentityProviderClient, SignUpCommand } = await import("@aws-sdk/client-cognito-identity-provider");
  const client = new CognitoIdentityProviderClient({ region: REGION });
  await client.send(new SignUpCommand({
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [{ Name: "email", Value: email }]
  }));
}

async function confirmSignUp(email, code) {
  const { CognitoIdentityProviderClient, ConfirmSignUpCommand } = await import("@aws-sdk/client-cognito-identity-provider");
  const client = new CognitoIdentityProviderClient({ region: REGION });
  await client.send(new ConfirmSignUpCommand({
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: code
  }));
}

async function login(email, password) {
  const { CognitoIdentityProviderClient, InitiateAuthCommand } = await import("@aws-sdk/client-cognito-identity-provider");
  const client = new CognitoIdentityProviderClient({ region: REGION });
  const result = await client.send(new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: { USERNAME: email, PASSWORD: password }
  }));
  return result.AuthenticationResult.IdToken;
}

// ── API helpers ─────────────────────────────────────────────────

async function apiGet(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiPost(path, token, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`POST ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiPatch(path, token, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`PATCH ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function pollUntilReady(courseId, materialId, token, maxWaitSeconds = 120) {
  const start = Date.now();
  while (Date.now() - start < maxWaitSeconds * 1000) {
    const materials = await apiGet(`/courses/${courseId}/materials`, token);
    const material = materials.find((m) => m.materialId === materialId);
    if (!material) throw new Error("Material not found");
    if (material.status === "ready") return material;
    if (material.status === "failed") throw new Error(`Processing failed: ${material.errorMessage}`);
    await sleep(2000);
  }
  throw new Error(`Timed out waiting for material ${materialId} after ${maxWaitSeconds}s`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function prompt(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.once("data", (data) => resolve(data.toString().trim()));
  });
}

main().catch((error) => {
  console.error("\n❌ Demo failed:", error.message);
  process.exit(1);
});
