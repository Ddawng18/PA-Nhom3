import { afterEach, describe, expect, it, vi } from "vitest";
import { assertApiUrlAllowed } from "./apiUrlPolicy";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("API URL policy", () => {
  it("allows same-host HTTP on the VPN during development", () => {
    vi.stubEnv("DEV", true);
    vi.stubGlobal("window", { location: { hostname: "26.182.136.64" } });
    expect(() => assertApiUrlAllowed(new URL("http://26.182.136.64:4174"))).not.toThrow();
    expect(() => assertApiUrlAllowed(new URL("http://other.example:4174"))).toThrow();
  });
  it("requires HTTPS for VPN addresses in production", () => {
    vi.stubEnv("DEV", false);
    vi.stubGlobal("window", { location: { hostname: "26.182.136.64" } });
    expect(() => assertApiUrlAllowed(new URL("http://26.182.136.64:4174"))).toThrow();
    expect(() => assertApiUrlAllowed(new URL("https://api.example.com"))).not.toThrow();
    expect(() => assertApiUrlAllowed(new URL("http://localhost:4174"))).not.toThrow();
  });
});
