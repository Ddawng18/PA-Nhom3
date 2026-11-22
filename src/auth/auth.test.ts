import { describe, expect, it } from "vitest";
import { getAuthErrorMessage } from "./errors";
import { loginSchema, registerSchema } from "./schemas";
import { readRememberState, shouldKeepStoredSession } from "./sessionPolicy";

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
        password: "password1",
        confirmPassword: "password1",
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

  it("requires letters, digits and the 64-character limit", () => {
    expect(registerSchema.safeParse({ displayName: "Linh", email: "linh@example.com", password: "12345678", confirmPassword: "12345678" }).success).toBe(false);
    expect(registerSchema.safeParse({ displayName: "Linh", email: "linh@example.com", password: "password", confirmPassword: "password" }).success).toBe(false);
    expect(registerSchema.safeParse({ displayName: "Linh", email: "linh@example.com", password: "a".repeat(65) + "1", confirmPassword: "a".repeat(65) + "1" }).success).toBe(false);
  });

  it("rejects a password confirmation that does not match", () => {
    expect(
      registerSchema.safeParse({
        displayName: "Linh",
        email: "linh@example.com",
        password: "password1",
        confirmPassword: "different",
      }).success
    ).toBe(false);
  });
});

describe("remember-me session policy", () => {
  const storage = (value: string | null) => ({ getItem: () => value });

  it("keeps a session when remember me is enabled", () => {
    expect(shouldKeepStoredSession(true, { remember: true, tabMarker: false })).toBe(true);
  });

  it("keeps the tab session on reload when remember me is disabled", () => {
    expect(shouldKeepStoredSession(true, { remember: false, tabMarker: true })).toBe(true);
  });

  it("drops a remembered Supabase session in a new tab when remember me is disabled", () => {
    expect(shouldKeepStoredSession(true, { remember: false, tabMarker: false })).toBe(false);
    expect(shouldKeepStoredSession(false, { remember: false, tabMarker: false })).toBe(true);
  });

  it("reads explicit opt-out and treats missing storage as remember-me enabled", () => {
    expect(readRememberState(storage("0"), storage(null))).toEqual({ remember: false, tabMarker: false });
    expect(readRememberState(storage("1"), storage("1"))).toEqual({ remember: true, tabMarker: true });
    expect(readRememberState(storage(null), storage(null))).toEqual({ remember: true, tabMarker: false });
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

  it("maps Google provider and OAuth callback errors", () => {
    expect(getAuthErrorMessage("Unsupported provider: provider is not enabled")).toContain("Google");
    expect(getAuthErrorMessage("access_denied")).toBe("Bạn đã hủy đăng nhập Google.");
  });

  it("distinguishes delivery errors from other provider failures without exposing provider details", () => {
    expect(getAuthErrorMessage("Error sending confirmation email", "unexpected_failure")).toBe(
      "Hệ thống chưa gửi được email. Vui lòng thử lại sau.",
    );
    expect(getAuthErrorMessage("Unexpected server error", "unexpected_failure")).toContain("mã unexpected_failure");
    expect(getAuthErrorMessage(undefined, "weak_password")).toContain("bảo mật");
    expect(getAuthErrorMessage(undefined, "email_address_not_authorized")).toContain("chưa cho phép");
  });

  it("returns a friendly fallback for unknown errors", () => {
    expect(getAuthErrorMessage("unexpected error")).toBe("Đã có lỗi xảy ra. Vui lòng thử lại sau.");
  });
});
