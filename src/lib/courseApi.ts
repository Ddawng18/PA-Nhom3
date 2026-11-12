import { z } from "zod";

export const rowIdSchema = z.union([z.number().int().nonnegative(), z.string()]);

export const courseRowSchema = z.object({
  ma_khoa_hoc: rowIdSchema,
  ma_giao_vien: z.string().nullable().optional(),
  tieu_de: z.string(),
  mo_ta: z.string().default(""),
  cap_do: z.string().nullable().optional(),
  chu_de: z.string().nullable().optional(),
  anh_dai_dien: z.string().nullable().optional(),
  trang_thai: z.string(),
  ngay_tao: z.string().datetime({ offset: true }).optional(),
}).passthrough();

export type CourseRow = z.infer<typeof courseRowSchema>;
