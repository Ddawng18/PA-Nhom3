import { z } from "zod";

const emailSchema = z.string().trim().email("Vui lòng nhập địa chỉ email hợp lệ.");
const passwordSchema = z
  .string()
  .min(8, "Mật khẩu cần có ít nhất 8 ký tự.")
  .regex(/[a-z]/, "Mật khẩu cần có chữ thường.")
  .regex(/[A-Z]/, "Mật khẩu cần có chữ hoa.")
  .regex(/[0-9]/, "Mật khẩu cần có chữ số.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

export const emailSchemaForReset = z.object({ email: emailSchema });

export const registerSchema = z.object({
  displayName: z.string().trim().min(2, "Tên hiển thị cần có ít nhất 2 ký tự."),
  email: emailSchema,
  password: passwordSchema,
  acceptedTerms: z.boolean().refine((accepted) => accepted, "Bạn cần đồng ý với điều khoản."),
});

export const newPasswordSchema = z.object({ password: passwordSchema });
