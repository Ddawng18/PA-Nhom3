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
  it("requires a name, a complex password, and accepted terms", () => {
    expect(
      registerSchema.safeParse({
        displayName: "Linh",
        email: "linh@example.com",
        password: "Drawing8",
        acceptedTerms: true,
      }).success
    ).toBe(true);
    expect(
      registerSchema.safeParse({
        displayName: "L",
        email: "linh@example.com",
        password: "drawing",
        acceptedTerms: false,
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

  it("returns a friendly fallback for unknown errors", () => {
    expect(getAuthErrorMessage("unexpected error")).toBe("Đã có lỗi xảy ra. Vui lòng thử lại sau.");
  });
});
