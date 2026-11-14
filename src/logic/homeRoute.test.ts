import { describe, expect, it } from "vitest";
import { getHomeRouteDecision } from "./homeRoute";

describe("home route decision", () => {
  it("waits for either authenticated or unauthenticated sessions to load", () => {
    expect(getHomeRouteDecision({ loading: true, hasUser: false })).toBe("loading");
    expect(getHomeRouteDecision({ loading: true, hasUser: true })).toBe("loading");
  });

  it("routes authenticated users to the dashboard and others to the guest home", () => {
    expect(getHomeRouteDecision({ loading: false, hasUser: true })).toBe("dashboard");
    expect(getHomeRouteDecision({ loading: false, hasUser: false })).toBe("guest");
  });
});
