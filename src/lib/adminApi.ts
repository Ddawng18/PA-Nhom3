import { z } from "zod";
import { buildApiUrl } from "../logic/approvals";

const nullableString = z.string().nullable();
const dateTime = z.string().datetime({ offset: true });

export const teacherProfileListItemSchema = z.object({
  id: z.number().int(),
  userId: z.string(),
  displayName: nullableString,
  email: nullableString,
  introduction: z.string(),
  experience: z.string(),
  status: z.string(),
  supplementReason: nullableString,
  submittedAt: dateTime,
  reviewedAt: dateTime.nullable(),
  resubmissionCount: z.number().int(),
});

export const teacherProfileListSchema = z.object({
  items: z.array(teacherProfileListItemSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export const portfolioFileSchema = z.object({
  id: z.number().int(),
  filePath: z.string(),
  downloadUrl: z.string(),
  signedUrlEndpoint: z.string(),
  uploadedAt: dateTime,
});

export const profileHistorySchema = z.object({
  previousStatus: nullableString,
  status: z.string(),
  reason: nullableString,
  reasonCode: nullableString,
  internalNote: nullableString,
  fields: z.array(z.string()),
  occurredAt: dateTime,
});

export const teacherProfileDetailSchema = z.object({
  id: z.number().int(),
  userId: z.string(),
  displayName: nullableString,
  email: nullableString,
  introduction: z.string(),
  experience: z.string(),
  status: z.string(),
  rejectionReason: nullableString,
  supplementReason: nullableString,
  reasonCode: nullableString,
  internalNote: nullableString,
  fields: z.array(z.string()),
  submittedAt: dateTime,
  reviewedAt: dateTime.nullable(),
  portfolioFiles: z.array(portfolioFileSchema),
  history: z.array(profileHistorySchema),
});

export const approveTeacherResponseSchema = z.object({
  id: z.number().int().safe(),
  status: z.literal("DA_DUYET"),
  role: z.literal("teacher"),
  reviewedAt: dateTime,
});

export const rejectTeacherResponseSchema = z.object({
  id: z.number().int().safe(),
  status: z.literal("TU_CHOI"),
  reasonCode: nullableString,
  rejectionReason: z.string(),
  reviewedAt: dateTime,
});

export const signedUrlResponseSchema = z.object({
  url: z.string().url(),
  expiresAt: dateTime,
});

const courseApprovalResponseBaseSchema = z.object({
  id: z.union([z.number().int().safe(), z.string().regex(/^\d+$/)]),
  reviewedAt: dateTime,
});

export const approveCourseResponseSchema = courseApprovalResponseBaseSchema.extend({
  status: z.literal("DA_DANG"),
});

export const rejectCourseResponseSchema = courseApprovalResponseBaseSchema.extend({
  status: z.literal("NHAP"),
  rejectionReason: z.string(),
});

const apiProblemSchema = z.object({
  code: z.string().optional(),
  status: z.number().optional(),
  detail: z.string().optional(),
  message: z.string().optional(),
}).passthrough();

export type TeacherProfileListItem = z.infer<typeof teacherProfileListItemSchema>;
export type TeacherProfileList = z.infer<typeof teacherProfileListSchema>;
export type TeacherProfileDetail = z.infer<typeof teacherProfileDetailSchema>;
export type PortfolioFile = z.infer<typeof portfolioFileSchema>;
export type ProfileHistory = z.infer<typeof profileHistorySchema>;
export type CourseApprovalResponse = z.infer<typeof approveCourseResponseSchema>
  | z.infer<typeof rejectCourseResponseSchema>;

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

export class AdminApiTimeoutError extends Error {
  constructor() {
    super("Máy chủ đang phản hồi chậm hoặc đang khởi động. Vui lòng thử lại sau ít phút.");
    this.name = "AdminApiTimeoutError";
  }
}

export class UnsupportedCourseApprovalError extends Error {
  constructor() {
    super("Máy chủ chưa hỗ trợ duyệt khóa học.");
    this.name = "UnsupportedCourseApprovalError";
  }
}

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  token: string;
  body?: unknown;
  signal?: AbortSignal;
  allowUnsupportedCourseApi?: boolean;
};

export function buildAdminApiHeaders(token?: string): Record<string, string> {
  return token === undefined ? {} : { Authorization: `Bearer ${token}` };
}

function getErrorDetails(payload: unknown): { code?: string; message: string } {
  const parsed = apiProblemSchema.safeParse(payload);
  if (!parsed.success) return { message: "" };
  const data = parsed.data;
  return {
    code: data.code,
    message: data.detail ?? data.message ?? "",
  };
}

export async function requestAdminApi(
  path: string,
  options: ApiRequestOptions,
  params?: Record<string, string | number | undefined>
): Promise<unknown> {
  const base = import.meta.env.VITE_API_URL;
  if (!base?.trim()) throw new Error("Chưa cấu hình địa chỉ máy chủ.");
  const url = buildApiUrl(base, path, params);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30_000);
  const abortParent = () => controller.abort();
  options.signal?.addEventListener("abort", abortParent, { once: true });
  if (options.signal?.aborted) controller.abort();

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        ...buildAdminApiHeaders(options.token),
        ...(options.body === undefined || options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      },
      ...(options.body === undefined ? {} : { body: options.body instanceof FormData ? options.body : JSON.stringify(options.body) }),
      signal: controller.signal,
    });
    const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      if (options.allowUnsupportedCourseApi && [404, 405, 501].includes(response.status)) {
        throw new UnsupportedCourseApprovalError();
      }
      const { code, message } = getErrorDetails(payload);
      throw new AdminApiError(message, response.status, code);
    }
    return payload;
  } catch (error) {
    if (error instanceof UnsupportedCourseApprovalError || error instanceof AdminApiError) throw error;
    if (controller.signal.aborted && !options.signal?.aborted) throw new AdminApiTimeoutError();
    throw error;
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abortParent);
  }
}

export async function getTeacherProfiles(
  token: string,
  query: { status: string; q: string; page: number; pageSize: number },
  signal?: AbortSignal
): Promise<TeacherProfileList> {
  const payload = await requestAdminApi("/api/admin/teacher-profiles", { token, signal }, query);
  return teacherProfileListSchema.parse(payload);
}

export async function getTeacherProfile(
  token: string,
  id: number,
  signal?: AbortSignal
): Promise<TeacherProfileDetail> {
  const payload = await requestAdminApi(`/api/admin/teacher-profiles/${id}`, { token, signal });
  return teacherProfileDetailSchema.parse(payload);
}

export async function approveTeacherProfile(
  token: string,
  id: number,
  note?: string,
  signal?: AbortSignal
): Promise<z.infer<typeof approveTeacherResponseSchema>> {
  const payload = await requestAdminApi(`/api/admin/teacher-profiles/${id}/approve`, {
    method: "POST",
    token,
    body: note ? { note } : {},
    signal,
  });
  return approveTeacherResponseSchema.parse(payload);
}

export async function rejectTeacherProfile(
  token: string,
  id: number,
  body: { reasonCode: string; reason: string },
  signal?: AbortSignal
): Promise<z.infer<typeof rejectTeacherResponseSchema>> {
  const payload = await requestAdminApi(`/api/admin/teacher-profiles/${id}/reject`, {
    method: "POST",
    token,
    body,
    signal,
  });
  return rejectTeacherResponseSchema.parse(payload);
}

export async function getPortfolioSignedUrl(
  token: string,
  id: number,
  imageId: number,
  signal?: AbortSignal
): Promise<z.infer<typeof signedUrlResponseSchema>> {
  const payload = await requestAdminApi(
    `/api/admin/teacher-profiles/${id}/portfolio/${imageId}/signed-url`,
    { method: "POST", token, signal }
  );
  return signedUrlResponseSchema.parse(payload);
}

export async function approveCourse(
  token: string,
  courseId: number,
  signal?: AbortSignal
): Promise<z.infer<typeof approveCourseResponseSchema>> {
  const payload = await requestAdminApi(
    `/api/admin/courses/${courseId}/approve`,
    { method: "POST", token, signal, allowUnsupportedCourseApi: true }
  );
  return approveCourseResponseSchema.parse(payload);
}

export async function rejectCourse(
  token: string,
  courseId: number,
  reason: string,
  signal?: AbortSignal
): Promise<z.infer<typeof rejectCourseResponseSchema>> {
  const payload = await requestAdminApi(
    `/api/admin/courses/${courseId}/reject`,
    { method: "POST", token, body: { reason }, signal, allowUnsupportedCourseApi: true }
  );
  return rejectCourseResponseSchema.parse(payload);
}
