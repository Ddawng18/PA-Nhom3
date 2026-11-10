import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchVerifiedAccount } from "./account";

afterEach(() => vi.unstubAllGlobals());

describe("fetchVerifiedAccount", () => {
  it("sends the Supabase session token to the configured API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "123", displayName: "A", role: "student" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchVerifiedAccount("https://api.example", "session-token")).resolves.toMatchObject({ role: "student" });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer session-token");
  });

  it("rejects insecure remote URLs before sending a token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchVerifiedAccount("http://api.example", "session-token")).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
