import { supabase } from "./supabase";
import type { DetectedFileKind } from "../logic/courseEditor";

const mediaBucket = import.meta.env.VITE_SUPABASE_MEDIA_BUCKET?.trim() ?? "";
const attachmentsBucket = import.meta.env.VITE_SUPABASE_ATTACHMENTS_BUCKET?.trim() ?? "";

export const isCourseMediaConfigured = Boolean(mediaBucket);
export const isCourseAttachmentConfigured = Boolean(
  mediaBucket && attachmentsBucket && attachmentsBucket !== mediaBucket
);

export type CourseStorageBucket = "media" | "attachments";

function getStorageClient(bucketKind: CourseStorageBucket) {
  if (!supabase) throw new Error("Ứng dụng chưa được cấu hình Supabase.");
  const bucket = bucketKind === "media" ? mediaBucket : attachmentsBucket;
  if (!bucket || !mediaBucket || (bucketKind === "attachments" && bucket === mediaBucket)) {
    throw new Error("Tải tệp chưa được cấu hình.");
  }
  return { client: supabase, bucket };
}

export async function uploadCourseMedia(
  path: string,
  file: File,
  fileKind: DetectedFileKind,
  bucketKind: CourseStorageBucket
) {
  const { client, bucket } = getStorageClient(bucketKind);
  const { data, error } = await client.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const publicUrl = bucketKind === "media"
    ? client.storage.from(bucket).getPublicUrl(data.path).data.publicUrl
    : null;
  return { path: data.path, publicUrl, fileKind };
}

export async function removeCourseMedia(paths: string | string[], bucketKind: CourseStorageBucket): Promise<void> {
  const { client, bucket } = getStorageClient(bucketKind);
  const { error } = await client.storage.from(bucket).remove(Array.isArray(paths) ? paths : [paths]);
  if (error) throw error;
}

export async function createCourseMediaSignedUrl(path: string): Promise<string> {
  const { client, bucket } = getStorageClient("attachments");
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 600);
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
