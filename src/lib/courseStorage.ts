import { requestAdminApi } from "./adminApi";
import { supabase } from "./supabase";
import type { DetectedFileKind } from "../logic/courseEditor";

const attachmentsBucket = import.meta.env.VITE_SUPABASE_ATTACHMENTS_BUCKET?.trim() ?? "";

export const isCourseMediaConfigured = Boolean(import.meta.env.VITE_API_URL);
export const isCourseAttachmentConfigured = Boolean(import.meta.env.VITE_API_URL);

export type CourseStorageBucket = "media" | "attachments";

export async function uploadCourseMedia(
  token: string,
  courseId: string | number,
  file: File,
  fileKind: DetectedFileKind,
  bucketKind: CourseStorageBucket
) {
  const body = new FormData();
  body.append("file", file);
  const result = await requestAdminApi(`/api/courses/${courseId}/media/${bucketKind}`, {
    token,
    method: "POST",
    body,
  }) as { path: string; publicUrl: string | null };
  return { ...result, fileKind };
}

export async function removeCourseMedia(
  token: string,
  courseId: string | number,
  paths: string | string[],
  bucketKind: CourseStorageBucket
): Promise<void> {
  for (const path of Array.isArray(paths) ? paths : [paths]) {
    await requestAdminApi(`/api/courses/${courseId}/media/${bucketKind}`, {
      token,
      method: "DELETE",
    }, { path });
  }
}

export async function createCourseMediaSignedUrl(path: string): Promise<string> {
  if (!supabase || !attachmentsBucket) throw new Error("Tải tệp chưa được cấu hình.");
  const { data, error } = await supabase.storage.from(attachmentsBucket).createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}

export async function cleanCourseMediaName(name: string): Promise<string> {
  const sanitized = Array.from(name.replace(/[\\/]/g, "_"))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .trim();
  return Array.from(sanitized).slice(0, 255).join("");
}
