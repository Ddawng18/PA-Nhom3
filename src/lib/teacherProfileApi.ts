import { z } from "zod";
import { AdminApiError, portfolioFileSchema, profileHistorySchema, requestAdminApi, signedUrlResponseSchema } from "./adminApi";

export const teacherProfileSchema = z.object({
  id: z.number().int().safe(), userId: z.string(), introduction: z.string(), experience: z.string(),
  status: z.enum(["CHO_DUYET", "CAN_BO_SUNG", "DA_DUYET", "TU_CHOI"]),
  rejectionReason: z.string().nullable(), supplementReason: z.string().nullable(), fields: z.array(z.string()),
  portfolioFiles: z.array(portfolioFileSchema), history: z.array(profileHistorySchema),
});
export type TeacherProfile = z.infer<typeof teacherProfileSchema>;

export async function getMyTeacherProfile(token: string, signal?: AbortSignal) {
  try {
    return teacherProfileSchema.parse(await requestAdminApi("/api/teacher/profile/me", { token, signal }));
  } catch (error) {
    // A missing route also returns 404: only the domain code means no application.
    if (error instanceof AdminApiError && error.status === 404 && error.code === "NOT_FOUND") return null;
    throw error;
  }
}

export async function uploadPortfolio(token: string, file: File) {
  const body = new FormData(); body.append("file", file);
  const payload = await requestAdminApi("/api/teacher/profile/me/portfolio", { token, method: "POST", body });
  return z.object({ filePath: z.string(), size: z.number(), fileName: z.string() }).parse(payload);
}

export async function submitTeacherProfile(token: string, introduction: string, experience: string, portfolioFiles: string[]) {
  return requestAdminApi("/api/teacher/profile/me/submit", {
    token, method: "POST", body: { introduction, experience, portfolioFiles },
  });
}

export async function getMyPortfolioUrl(token: string, imageId: number) {
  return signedUrlResponseSchema.parse(await requestAdminApi(
    `/api/teacher/profile/me/portfolio/${imageId}/signed-url`, { token, method: "POST" }
  )).url;
}
