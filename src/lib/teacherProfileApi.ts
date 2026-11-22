import { z } from "zod";
import { AdminApiError, portfolioFileSchema, profileHistorySchema, requestAdminApi, signedUrlResponseSchema, teacherApplicationDetailsSchema, getApiRequestUrl } from "./adminApi";

export const teacherProfileSchema = z.object({
  id: z.number().int().safe(), userId: z.string(), introduction: z.string(), experience: z.string(),
  status: z.enum(["CHO_DUYET", "CAN_BO_SUNG", "DA_DUYET", "TU_CHOI", "DA_RUT"]),
  rejectionReason: z.string().nullable(), supplementReason: z.string().nullable(), fields: z.array(z.string()),
  portfolioFiles: z.array(portfolioFileSchema), history: z.array(profileHistorySchema),
  details: teacherApplicationDetailsSchema.optional(), hasCv: z.boolean().optional(),
});
export type TeacherProfile = z.infer<typeof teacherProfileSchema>;
export type TeacherApplicationDetails = z.infer<typeof teacherApplicationDetailsSchema>;

export async function getMyTeacherProfile(token: string, signal?: AbortSignal) {
  try {
    return teacherProfileSchema.parse(await requestAdminApi("/api/teacher/profile/me", { token, signal }));
  } catch (error) {
    // A missing route also returns 404: only the domain code means no application.
    if (error instanceof AdminApiError && error.status === 404 && error.code === "NOT_FOUND") return null;
    throw error;
  }
}

export async function withdrawTeacherProfile(token: string) {
  await requestAdminApi("/api/teacher/profile/me/withdraw", { token, method: "POST" });
}

export async function removeTeacherAttachment(token: string, imageId?: number) {
  const path = imageId === undefined ? "cv" : `portfolio/${imageId}`;
  await requestAdminApi(`/api/teacher/profile/me/${path}`, { token, method: "DELETE" });
}

export async function uploadPortfolio(token: string, file: File) {
  const body = new FormData(); body.append("file", file);
  const payload = await requestAdminApi("/api/teacher/profile/me/portfolio", { token, method: "POST", body });
  return z.object({ filePath: z.string(), size: z.number(), fileName: z.string() }).parse(payload);
}

export async function submitTeacherProfile(token: string, application: {
  introduction: string;
  experience: string;
  portfolioFiles: string[];
  details: TeacherApplicationDetails;
  cv?: File;
}) {
  const { cv, ...fields } = application;
  const cvPdf = cv && await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Không đọc được tệp CV."));
    reader.readAsDataURL(cv);
  });
  return requestAdminApi("/api/teacher/profile/me/submit", {
    token, method: "POST", body: { ...fields, cvPdf },
  });
}

export async function downloadTeacherCv(token: string, id: number) {
  const response = await fetch(getApiRequestUrl(`/api/teacher/profile/${id}/cv`), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok || !response.headers.get("content-type")?.startsWith("application/pdf"))
    throw new Error("Không thể tải CV. Vui lòng thử lại.");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = "CV-giao-vien.pdf";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function getMyPortfolioUrl(token: string, imageId: number) {
  return signedUrlResponseSchema.parse(await requestAdminApi(
    `/api/teacher/profile/me/portfolio/${imageId}/signed-url`, { token, method: "POST" }
  )).url;
}
