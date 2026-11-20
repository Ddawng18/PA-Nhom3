import { z } from "zod";

const emailSchema = z.string().trim().email("Vui lòng nhập địa chỉ email hợp lệ.");
const passwordSchema = z.string()
  .min(8, "Mật khẩu cần từ 8 đến 64 ký tự.")
  .max(64, "Mật khẩu cần từ 8 đến 64 ký tự.")
  .regex(/\p{L}/u, "Mật khẩu cần có ít nhất một chữ cái.")
  .regex(/[0-9]/, "Mật khẩu cần có ít nhất một chữ số.");

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
