export type Difficulty = "easy" | "medium" | "hard";
export type MaterialStatus = "uploaded" | "processing" | "ready" | "failed";
export type StudyTaskStatus = "todo" | "done" | "skipped";

export interface Course {
  courseId: string;
  userId: string;
  name: string;
  examDate: string;
  difficulty: Difficulty;
  weeklyHoursAvailable: number;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  materialId: string;
  courseId: string;
  userId: string;
  fileName: string;
  s3Key: string;
  contentType: string;
  status: MaterialStatus;
  summary?: string;
  keyConcepts?: string[];
  createdAt: string;
  processedAt?: string;
  errorMessage?: string;
}

export interface StudyTask {
  taskId: string;
  planId: string;
  courseId: string;
  userId: string;
  date: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  status: StudyTaskStatus;
  reminderSentAt?: string;
}

export interface StudyPlan {
  planId: string;
  courseId: string;
  userId: string;
  generatedFromMaterialIds: string[];
  startDate: string;
  examDate: string;
  createdAt: string;
}
