export type AccountRole = "student" | "teacher" | "admin";
export type VerifiedAccount = { id: string; displayName: string | null; role: AccountRole };

export async function fetchVerifiedAccount(apiUrl: string, token: string, signal?: AbortSignal): Promise<VerifiedAccount> {
  const url = new URL("/api/account/me", apiUrl);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new Error("API URL must use HTTPS");
  }
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal });
  if (!response.ok) throw new Error(`Account request failed (${response.status})`);
  const account: unknown = await response.json();
  if (!account || typeof account !== "object" || !("id" in account) || typeof account.id !== "string" ||
      !("role" in account) || !["student", "teacher", "admin"].includes(String(account.role))) {
    throw new Error("Invalid account response");
  }
  return account as VerifiedAccount;
}
