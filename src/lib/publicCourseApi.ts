import { z } from "zod";
import { requestAdminApi } from "./adminApi";
import { courseRowSchema } from "./courseApi";
import { keepPublished, type PublishedCourseResponse } from "../logic/publicCourses";

const publicCourseListSchema = z.object({
  items: z.array(courseRowSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalCount: z.number().int().nonnegative(),
});

export type ListPublishedCoursesInput = {
  page: number;
  pageSize: number;
  search: string;
  signal?: AbortSignal;
};

export async function listPublishedCourses({
  page,
  pageSize,
  search,
  signal,
}: ListPublishedCoursesInput): Promise<PublishedCourseResponse> {
  const payload = await requestAdminApi("/api/courses", { signal }, { page, pageSize, search });
  const parsed = publicCourseListSchema.parse(payload);
  return {
    ...parsed,
    items: keepPublished(parsed.items),
  };
}
