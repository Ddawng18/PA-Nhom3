import { describe, expect, it } from "vitest";
import { buildAdminApiHeaders } from "./adminApi";

describe("admin API authorization headers", () => {
  it("omits authorization when no token is supplied", () => {
    expect(buildAdminApiHeaders()).toEqual({});
  });

  it("preserves bearer authorization for authenticated requests", () => {
    expect(buildAdminApiHeaders("session-token")).toEqual({
      Authorization: "Bearer session-token",
    });
  });
});
