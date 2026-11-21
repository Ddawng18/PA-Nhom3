import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const port = await new Promise(resolve => {
  const socket = createServer();
  socket.listen(0, "127.0.0.1", () => {
    const value = socket.address().port; socket.close(() => resolve(value));
  });
});
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: fileURLToPath(new URL("../", import.meta.url)), windowsHide: true, stdio: "ignore",
  env: { ...process.env, VITE_API_URL: "http://localhost:4174", VITE_SUPABASE_URL: "https://linea-auth-test.supabase.co", VITE_SUPABASE_ANON_KEY: "browser-test-key" },
});
let browser;
const session = {
  access_token: "fixture-access-token", refresh_token: "fixture-refresh-token",
  expires_in: 3600, token_type: "bearer",
  user: { id: "83c057ea-280a-4cb7-abaa-9a25cf1acc84", email: "student@example.test", aud: "authenticated", user_metadata: {}, app_metadata: {} },
};
const key = "sb-linea-auth-test-auth-token";
try {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({ headless: true });
  for (const remember of [false, true]) {
    const context = await browser.newContext();
    let logoutCalls = 0;
    await context.route("https://linea-auth-test.supabase.co/**", async route => {
      const { pathname } = new URL(route.request().url());
      if (pathname.endsWith("/logout")) {
        logoutCalls += 1;
        return route.fulfill({ status: 204 });
      }
      if (pathname === "/rest/v1/nguoi_dung") return route.fulfill({ json: [{ role: "student" }] });
      return route.fulfill({ json: pathname.endsWith("/token") ? session : pathname.endsWith("/user") ? session.user : [] });
    });
    await context.route("**/api/**", route => route.fulfill({ json: {} }));
    const page = await context.newPage();
    await page.goto(origin + "/login");
    await page.locator('input[name="email"]').fill(session.user.email);
    await page.locator('input[name="password"]').fill("BrowserTest123");
    await page.getByRole("checkbox").setChecked(remember);
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(key => !!(localStorage.getItem(key) || window.sessionStorage.getItem(key)), key);
    assert.equal(await page.evaluate(key => !!localStorage.getItem(key), key), remember);
    assert.equal(await page.evaluate(key => !!window.sessionStorage.getItem(key), key), !remember);
    const second = await context.newPage();
    await second.goto(origin + "/dashboard");
    if (remember) {
      await second.locator("main").waitFor();
      assert.equal(new URL(second.url()).pathname, "/dashboard");
    } else {
      await second.waitForURL("**/login");
    }
    assert.equal(logoutCalls, 0);
    await page.goto(origin + "/dashboard");
    await page.locator("main").waitFor();
    assert.equal(new URL(page.url()).pathname, "/dashboard");
    await page.reload();
    await page.locator("main").waitFor();
    assert.equal(new URL(page.url()).pathname, "/dashboard");
    if (!remember) {
      await page.goto(origin + "/settings?tab=bao-mat");
      const recovery = page.waitForRequest(request => new URL(request.url()).pathname.endsWith("/recover"));
      await page.getByRole("button", { name: "Gửi email đổi mật khẩu" }).click();
      assert.equal((await recovery).postDataJSON().email, session.user.email);
      await page.getByText("Đã gửi liên kết đổi mật khẩu đến email của bạn.").waitFor();
    }
    await page.route("**/api/admin/users**", route => route.fulfill({ status: 401, json: {} }));
    await page.evaluate(async token => {
      const { requestAdminApi } = await import("/src/lib/adminApi.ts");
      await requestAdminApi("/api/admin/users", { token }).catch(() => {});
    }, session.access_token);
    await page.waitForURL("**/login");
    await page.getByText("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.").waitFor();
    assert.equal(logoutCalls, 1);
    await context.close();
  }
  console.log("PASS Remember me, independent tabs, reload, recovery request and API 401 expiry");
} finally {
  await browser?.close();
  if (process.platform === "win32") await new Promise(resolve => {
    spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("close", resolve);
  }); else server.kill();
}
