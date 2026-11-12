import { describe, expect, it } from "vitest";
import { buildAdminApiHeaders } from "./adminApi";
import { buildApiUrl } from "../logic/approvals";

describe("admin API authorization headers", () => {
  it("omits authorization when no token is supplied", () => {
    expect(buildAdminApiHeaders()).toEqual({});
    expect(buildAdminApiHeaders(" ")).toEqual({});
  });

  it("preserves bearer authorization for authenticated requests", () => {
    expect(buildAdminApiHeaders("session-token")).toEqual({
      Authorization: "Bearer session-token",
    });
  });
});

describe("admin API URL builder", () => {
  it("adds query parameters without dropping empty values or trailing slashes", () => {
    expect(buildApiUrl("https://api.example.com/", "/admin/users", { page: 2, search: "", status: "active" })).toBe(
      "https://api.example.com/admin/users?page=2&status=active"
    );
  });
});

