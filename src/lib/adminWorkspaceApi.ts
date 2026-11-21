import { z } from "zod";
import { requestAdminApi } from "./adminApi";

const id = z.number().int().safe().positive();
const dateTime = z.string();
export const auditRowSchema = z.object({
  id, objectType: z.string(), objectId: z.string(), previousStatus: z.string().nullable(),
  status: z.string(), reason: z.string().nullable(), actor: z.string(), occurredAt: dateTime,
});
export type AuditRow = z.infer<typeof auditRowSchema>;

export const adminOverviewSchema = z.object({
  counts: z.object({
    users: z.number().int().nonnegative(), teachers: z.number().int().nonnegative(),
    pendingTeachers: z.number().int().nonnegative(), courses: z.number().int().nonnegative(),
    pendingCourses: z.number().int().nonnegative(), hiddenCourses: z.number().int().nonnegative(),
    posts: z.number().int().nonnegative(), hiddenPosts: z.number().int().nonnegative(),
    openReports: z.number().int().nonnegative(),
    orders: z.number().int().nonnegative(),
    revenueVnd: z.number().int().nonnegative(),
  }),
  audit: z.array(auditRowSchema),
  reports: z.array(z.object({
    id, postId: id, reason: z.string(), status: z.string(), createdAt: dateTime,
  })),
});
export type AdminOverview = z.infer<typeof adminOverviewSchema>;

export const adminAuditSchema = z.object({
  items: z.array(auditRowSchema), total: z.number().int().nonnegative(), page: z.number().int().positive(),
});

export async function loadAdminOverview(token: string, signal?: AbortSignal) {
  return adminOverviewSchema.parse(await requestAdminApi("/api/admin/overview", { token, signal }));
}

export async function loadAdminAudit(token: string, objectType: string, page: number, signal?: AbortSignal) {
  return adminAuditSchema.parse(
    await requestAdminApi("/api/admin/audit", { token, signal }, { objectType, page }),
  );
}
