import { describe, expect, it } from "vitest";
import { getAuthErrorMessage } from "./errors";
import { loginSchema, registerSchema } from "./schemas";

describe("loginSchema", () => {
  it("accepts a valid email and a non-empty password without registration complexity rules", () => {
    expect(loginSchema.safeParse({ email: "person@example.com", password: "x" }).success).toBe(true);
  });

  it("rejects an invalid email and an empty password", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("requires a name, a password of at least eight characters, and matching confirmation", () => {
    expect(
      registerSchema.safeParse({
        displayName: "Linh",
        email: "linh@example.com",
        password: "password",
        confirmPassword: "password",
      }).success
    ).toBe(true);
    expect(
      registerSchema.safeParse({
        displayName: "",
        email: "linh@example.com",
        password: "short",
        confirmPassword: "different",
      }).success
    ).toBe(false);
  });

  it("rejects a password confirmation that does not match", () => {
    expect(
      registerSchema.safeParse({
        displayName: "Linh",
        email: "linh@example.com",
        password: "password",
        confirmPassword: "different",
      }).success
    ).toBe(false);
  });
});

describe("getAuthErrorMessage", () => {
  it("maps Supabase credential errors without revealing which credential was wrong", () => {
    expect(getAuthErrorMessage("Invalid login credentials")).toBe("Email hoặc mật khẩu không đúng.");
  });

  it("maps confirmation and duplicate-account errors", () => {
    expect(getAuthErrorMessage("Email not confirmed")).toBe(
      "Email chưa được xác nhận. Hãy kiểm tra hộp thư."
    );
    expect(getAuthErrorMessage("User already registered")).toBe("Email này đã được đăng ký.");
  });

  it("maps rate-limit and network errors", () => {
    expect(getAuthErrorMessage("Email rate limit exceeded")).toBe(
      "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau."
    );
    expect(getAuthErrorMessage("Failed to fetch")).toBe(
      "Không thể kết nối mạng. Vui lòng kiểm tra kết nối và thử lại."
    );
  });

  it("returns a friendly fallback for unknown errors", () => {
    expect(getAuthErrorMessage("unexpected error")).toBe("Đã có lỗi xảy ra. Vui lòng thử lại sau.");
  });
});
