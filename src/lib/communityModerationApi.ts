import { z } from "zod";
import { requestAdminApi } from "./adminApi";

const dateTime = z.string();
export const communityReportSchema = z.object({
  id: z.number().int().positive(),
  postId: z.number().int().positive(),
  postTitle: z.string(),
  postBody: z.string(),
  postStatus: z.string(),
  author: z.string(),
  reporter: z.string(),
  reason: z.string(),
  status: z.string(),
  createdAt: dateTime,
  reviewedAt: dateTime.nullable(),
  note: z.string().nullable(),
});
export type CommunityReport = z.infer<typeof communityReportSchema>;

export async function loadCommunityReports(token: string, status: string, page: number, signal?: AbortSignal) {
  return z.array(communityReportSchema).parse(
    await requestAdminApi("/api/admin/community/reports", { token, signal }, { status, page }),
  );
}

export async function resolveCommunityReport(
  token: string,
  id: number,
  action: "HIDE" | "KEEP",
  note: string,
) {
  return z.object({ id: z.number(), action: z.string(), postStatus: z.string() }).parse(
    await requestAdminApi(`/api/admin/community/reports/${id}/resolve`, {
      token, method: "POST", body: { action, note: note.trim() || null },
    }),
  );
}

export async function setCommunityPostStatus(token: string, postId: number, status: "VISIBLE" | "HIDDEN") {
  return z.object({ id: z.number(), status: z.string() }).parse(
    await requestAdminApi(`/api/admin/community/posts/${postId}/status`, {
      token, method: "POST", body: { status },
    }),
  );
}
