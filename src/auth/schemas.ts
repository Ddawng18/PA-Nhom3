import { z } from "zod";

const emailSchema = z.string().trim().email("Vui lòng nhập địa chỉ email hợp lệ.");
const passwordSchema = z.string().min(8, "Mật khẩu cần có ít nhất 8 ký tự.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

export const emailSchemaForReset = z.object({ email: emailSchema });

export const registerSchema = z.object({
  displayName: z.string().trim().min(1, "Vui lòng nhập tên hiển thị."),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu."),
}).refine((values) => values.password === values.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp.",
  path: ["confirmPassword"],
});

export const newPasswordSchema = z.object({ password: passwordSchema });
