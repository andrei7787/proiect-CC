/**
 * E2E Demo Script - AI Study Planner (Interactive)
 * 
 * Usage: npx tsx scripts/e2e-demo.ts [email] [password]
 */

import { createInterface } from "node:readline";
import { readFileSync } from "node:fs";

const CONFIG = {
  region: "us-east-1",
  userPoolId: "us-east-1_nXeom8n79",
  clientId: "7u53kk3qhbrmtsomvv7032nrgo",
  apiBase: "https://nv414bjgp8.execute-api.us-east-1.amazonaws.com",
} as const;

const PASSWORD = "DemoPass123!";
const C = { g: "\x1b[32m", r: "\x1b[31m", y: "\x1b[33m", b: "\x1b[36m", reset: "\x1b[0m" };

let passed = 0, failed = 0;

function ok(msg: string) { passed++; console.log(`${C.g}✓${C.reset} ${msg}`); }
function err(msg: string) { failed++; console.log(`${C.r}✗${C.reset} ${msg}`); }
function info(msg: string) { console.log(`${C.y}→${C.reset} ${msg}`); }
function ask(prompt: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(`${C.b}?${C.reset} ${prompt} `, (answer: string) => { rl.close(); resolve(answer); }));
}

async function api<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${CONFIG.apiBase}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${options.method ?? "GET"} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────
async function loginOrRegister(hintEmail?: string, confirmCode?: string): Promise<{ email: string; idToken: string }> {
  const { CognitoIdentityProviderClient, SignUpCommand, ConfirmSignUpCommand, InitiateAuthCommand, AuthFlowType }
    = await import("@aws-sdk/client-cognito-identity-provider");
  const cognito = new CognitoIdentityProviderClient({ region: CONFIG.region });

  let email = hintEmail || await ask("Demo email address:");
  console.log(`${C.b}Email: ${email}${C.reset}`);

  // Try login first
  info("Trying login...");
  try {
    const auth = await cognito.send(new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: CONFIG.clientId,
      AuthParameters: { USERNAME: email, PASSWORD },
    }));
    const tokens = auth.AuthenticationResult;
    if (tokens?.IdToken) {
      ok("Logged in with existing account");
      return { email, idToken: tokens.IdToken };
    }
  } catch (e: any) {
    if (e.__type === "UserNotFoundException") {
      info("User not found — registering...");
    } else if (e.__type === "UserNotConfirmedException") {
      const code = confirmCode || await ask("Enter confirmation code from email:");
      info("Confirming user...");
      await cognito.send(new ConfirmSignUpCommand({
        ClientId: CONFIG.clientId,
        Username: email,
        ConfirmationCode: code,
      }));
      ok("User confirmed! Signing in...");
      const auth = await cognito.send(new InitiateAuthCommand({
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        ClientId: CONFIG.clientId,
        AuthParameters: { USERNAME: email, PASSWORD },
      }));
      const tokens = auth.AuthenticationResult;
      if (tokens?.IdToken) {
        ok("Signed in");
        return { email, idToken: tokens.IdToken };
      }
    } else {
      throw e;
    }
  }

  // Register new user
  info("Registering new user...");
  await cognito.send(new SignUpCommand({
    ClientId: CONFIG.clientId,
    Username: email,
    Password: PASSWORD,
    UserAttributes: [{ Name: "email", Value: email }],
  }));
  ok(`Registered! Check ${email} for confirmation code.`);
  console.log(`${C.y}→ Run again with: npx tsx scripts/e2e-demo.ts ${email} <CODE>${C.reset}`);
  process.exit(0);
}

// ── Main Flow ────────────────────────────────────────────────────────
async function main() {
  const hintEmail = process.argv[2];
  const confirmCode = process.argv[3];
  console.log(`\n${C.b}=== AI Study Planner — E2E Demo Rehearsal ===${C.reset}\n`);

  const { email, idToken } = await loginOrRegister(hintEmail, confirmCode);

  // ═══ Create Course ═══
  console.log("\n── Create Course ──");
  const course = await api<any>("/courses", idToken, {
    method: "POST",
    body: JSON.stringify({
      name: "Cloud & Serverless Demo",
      examDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      difficulty: "medium",
      weeklyHoursAvailable: 10,
    }),
  });
  ok(`Course created: ${course.courseId}`);
  const courseId = course.courseId;

  // ═══ Upload Material ═══
  console.log("\n── Upload Material ──");
  const pdfPath = "docs/demo-material.pdf";
  const upload = await api<{ material: any; uploadUrl: string }>("/materials/upload", idToken, {
    method: "POST",
    body: JSON.stringify({ courseId, fileName: "demo-material.pdf", contentType: "application/pdf" }),
  });
  ok(`Upload URL created: ${upload.material.materialId}`);

  const buffer = readFileSync(pdfPath);
  await fetch(upload.uploadUrl, { method: "PUT", headers: { "content-type": "application/pdf" }, body: buffer });
  ok("File uploaded to S3");

  // ═══ Process ═══
  console.log("\n── Queue Processing ──");
  await api(`/materials/${upload.material.materialId}/process`, idToken, { method: "POST" });
  ok("Queued");

  console.log("\n── Wait for Gemini ──");
  let material: any;
  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const res = await api<{ materials: any[] }>(`/courses/${courseId}/materials`, idToken);
    material = res.materials.find((m: any) => m.materialId === upload.material.materialId);
    info(`[${(i + 1) * 5}s] status: ${material?.status ?? "?"}`);
    if (material?.status === "ready" || material?.status === "failed") break;
  }
  ok(`Processing result: ${material?.status}`);
  if (material?.status === "ready") {
    ok(`Summary: ${material.summary?.slice(0, 80)}...`);
    ok(`Concepts: ${material.keyConcepts?.length ?? 0} found`);
  }

  // ═══ Study Plan ═══
  console.log("\n── Generate Study Plan ──");
  const plan = await api<any>("/study-plans", idToken, {
    method: "POST", body: JSON.stringify({ courseId }),
  });
  ok(`Plan created: ${plan.plan?.planId}`);

  // ═══ Tasks ═══
  console.log("\n── Study Tasks ──");
  const tasksRes = await api<{ tasks: any[] }>(`/courses/${courseId}/tasks`, idToken);
  const tasks = tasksRes.tasks;
  ok(`${tasks.length} tasks`);
  const today = new Date().toISOString().slice(0, 10);
  ok(`Tasks due today: ${tasks.filter((t: any) => t.date === today).length}`);

  if (tasks.length > 0) {
    await api(`/study-tasks/${tasks[0].taskId}`, idToken, {
      method: "PATCH", body: JSON.stringify({ status: "done" }),
    });
    ok(`Marked "${tasks[0].title}" as done`);
  }

  // ═══ Reminders ═══
  console.log("\n── Send Reminders ──");
  const reminderRes = await api<{ sent: number }>("/reminders/run", idToken, { method: "POST" });
  ok(`Sent: ${reminderRes.sent} reminders`);

  // ═══ Notifications ═══
  console.log("\n── Notifications ──");
  const notifs = await api<any[]>("/notifications", idToken);
  ok(`${notifs.length} notifications`);

  // ═══ Summary ═══
  console.log(`\n${C.b}=== E2E Complete: ${passed} passed, ${failed} failed ===${C.reset}\n`);
}

main().catch((e) => { err(`Fatal: ${e.message}`); console.error(e); process.exit(1); });
