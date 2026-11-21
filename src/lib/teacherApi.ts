import { z } from "zod";
import { requestAdminApi } from "./adminApi";

const id = z.number().int().safe().positive();
const dateTime = z.string();
export const teacherGradeSchema = z.object({ score: z.number(), feedback: z.string(), gradedAt: dateTime });

export const teacherOverviewSchema = z.object({
  totals: z.object({
    courses: z.number().int().nonnegative(),
    published: z.number().int().nonnegative(),
    drafts: z.number().int().nonnegative(),
    pendingSubmissions: z.number().int().nonnegative(),
    gradedSubmissions: z.number().int().nonnegative(),
    students: z.number().int().nonnegative(),
  }),
  courses: z.array(z.object({
    id, title: z.string(), status: z.string(), level: z.string(), topic: z.string(),
    createdAt: dateTime, pendingSubmissions: z.number().int().nonnegative(),
  })),
  recentSubmissions: z.array(z.object({
    id, status: z.string(), updatedAt: dateTime, courseId: id, studentId: z.string(), studentName: z.string(),
  })),
});
export type TeacherOverview = z.infer<typeof teacherOverviewSchema>;

export const teacherSubmissionQueueSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  items: z.array(z.object({
    id, courseId: id, courseTitle: z.string(), assignmentId: id, lessonTitle: z.string(), prompt: z.string(),
    studentId: z.string(), studentName: z.string(), status: z.string(), submittedAt: dateTime, updatedAt: dateTime,
    grade: teacherGradeSchema.nullable(),
  })),
});
export type TeacherSubmissionQueue = z.infer<typeof teacherSubmissionQueueSchema>;

export const teacherStudentsSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  items: z.array(z.object({
    studentId: z.string(), studentName: z.string(), courseId: id, courseTitle: z.string(),
    status: z.string(), enrolledAt: dateTime, completedAt: dateTime.nullable(),
  })),
});

export const submissionHistorySchema = z.array(z.object({
  id, previousStatus: z.string().nullable(), status: z.string(), reason: z.string().nullable(), occurredAt: dateTime,
}));

export async function loadTeacherOverview(token: string, signal?: AbortSignal) {
  return teacherOverviewSchema.parse(await requestAdminApi("/api/teacher/overview", { token, signal }));
}

export async function loadTeacherSubmissions(
  token: string,
  query: { status: string; courseId?: string; page: number },
  signal?: AbortSignal,
) {
  return teacherSubmissionQueueSchema.parse(
    await requestAdminApi("/api/teacher/submissions", { token, signal }, query),
  );
}

export async function loadTeacherStudents(
  token: string,
  query: { courseId?: string; page: number },
  signal?: AbortSignal,
) {
  return teacherStudentsSchema.parse(await requestAdminApi("/api/teacher/students", { token, signal }, query));
}

export async function loadSubmissionHistory(token: string, submissionId: number, signal?: AbortSignal) {
  return submissionHistorySchema.parse(
    await requestAdminApi(`/api/assignments/submissions/${submissionId}/history`, { token, signal }),
  );
}
