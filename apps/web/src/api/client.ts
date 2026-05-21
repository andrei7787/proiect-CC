import type {
  Course,
  Material,
  Notification,
  StudyPlan,
  StudyTask,
  StudyTaskStatus
} from "@ai-study-planner/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export interface ApiClientOptions {
  token?: string;
}

interface ListCoursesResponse {
  courses: Course[];
}

interface CreateMaterialUploadResponse {
  material: Material;
  uploadUrl: string;
}

interface ListCourseMaterialsResponse {
  materials: Material[];
}

interface GenerateStudyPlanResponse {
  plan: StudyPlan;
  tasks: StudyTask[];
}

interface ListCourseTasksResponse {
  tasks: StudyTask[];
}

export interface CreateMaterialUploadInput {
  courseId: string;
  fileName: string;
  contentType: string;
}

export interface DashboardDeadline {
  courseId: string;
  courseName: string;
  examDate: string;
}

export interface DashboardSummary {
  materialId: string;
  courseId: string;
  fileName: string;
  summary: string;
  keyConcepts: string[];
  processedAt?: string;
}

export interface DashboardData {
  courses: Course[];
  todayTasks: StudyTask[];
  deadlines: DashboardDeadline[];
  summaries: DashboardSummary[];
  notifications: Notification[];
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & ApiClientOptions = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("content-type", "application/json");
  if (options.token) headers.set("authorization", `Bearer ${options.token}`);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers
  });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function listCourses(token: string): Promise<Course[]> {
  const response = await apiRequest<ListCoursesResponse>("/courses", {
    method: "GET",
    token
  });
  return response.courses;
}

export async function getDashboard(token: string): Promise<DashboardData> {
  return apiRequest<DashboardData>("/dashboard", {
    method: "GET",
    token
  });
}

export async function createMaterialUpload(
  token: string,
  input: CreateMaterialUploadInput
): Promise<CreateMaterialUploadResponse> {
  return apiRequest<CreateMaterialUploadResponse>("/materials/upload", {
    method: "POST",
    token,
    body: JSON.stringify(input)
  });
}

export async function uploadFileToUrl(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": file.type || "application/octet-stream"
    },
    body: file
  });
  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
}

export async function queueMaterialProcessing(token: string, materialId: string): Promise<void> {
  await apiRequest<{ queued: boolean; materialId: string }>(`/materials/${materialId}/process`, {
    method: "POST",
    token
  });
}

export async function listCourseMaterials(token: string, courseId: string): Promise<Material[]> {
  const response = await apiRequest<ListCourseMaterialsResponse>(`/courses/${courseId}/materials`, {
    method: "GET",
    token
  });
  return response.materials;
}

export async function generateStudyPlan(
  token: string,
  courseId: string
): Promise<GenerateStudyPlanResponse> {
  return apiRequest<GenerateStudyPlanResponse>("/study-plans", {
    method: "POST",
    token,
    body: JSON.stringify({ courseId })
  });
}

export async function listCourseTasks(token: string, courseId: string): Promise<StudyTask[]> {
  const response = await apiRequest<ListCourseTasksResponse>(`/courses/${courseId}/tasks`, {
    method: "GET",
    token
  });
  return response.tasks;
}

export async function updateStudyTaskStatus(
  token: string,
  taskId: string,
  status: StudyTaskStatus
): Promise<Partial<StudyTask>> {
  return apiRequest<Partial<StudyTask>>(`/study-tasks/${taskId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status })
  });
}

export async function runReminders(token: string): Promise<{ sent: number }> {
  return apiRequest<{ sent: number }>("/reminders/run", {
    method: "POST",
    token
  });
}
