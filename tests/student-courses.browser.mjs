// Exercises local frontend code against the real demo student's Supabase data.
// Credentials are provided through environment variables, never stored here.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";

const email = process.env.LINEA_TEST_EMAIL;
const password = process.env.LINEA_TEST_PASSWORD;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
assert.ok(email && password && supabaseUrl && key, "Set LINEA_TEST_EMAIL, LINEA_TEST_PASSWORD, VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
const root = resolve(import.meta.dirname, "..");
const port = await new Promise(done => {
  const server = createServer(); server.listen(0, "127.0.0.1", () => {
    const selected = server.address().port; server.close(() => done(selected));
  });
});
const localUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: root, env: process.env, windowsHide: true, stdio: "ignore",
});
let session;
let browser;
try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(localUrl)).ok) { ready = true; break; } } catch { /* starting */ }
    await new Promise(done => setTimeout(done, 300));
  }
  assert.ok(ready, "Local Vite server did not start");
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200, "Demo student login failed");
  session = await response.json();
  session.expires_at ??= Math.floor(Date.now() / 1000) + session.expires_in;
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 950 } });
  const storageKey = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  await context.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key: storageKey, session });
  const page = await context.newPage();
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(localUrl + "/my-courses");
  await page.getByRole("heading", { name: "[DEMO] Khóa học Digital Art mẫu cho giáo viên", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Tất cả (1)", exact: true }).count(), 1);
  await page.getByRole("button", { name: "Đang học (1)", exact: true }).click();
  await page.getByRole("heading", { name: "[DEMO] Khóa học Digital Art mẫu cho giáo viên", exact: true }).waitFor();
  await page.getByRole("button", { name: "Hoàn thành (0)", exact: true }).click();
  await page.getByText("Bạn chưa có khóa học hoàn thành.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Tất cả (1)", exact: true }).click();
  console.log("PASS real enrollment renders with correct all/in-progress/completed filters");

  const artifacts = join(root, "test-results", "student-courses");
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: join(artifacts, "desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  await page.screenshot({ path: join(artifacts, "mobile.png"), fullPage: true });
  console.log("PASS mobile layout has no horizontal overflow");

  let failEnrollment = true;
  await page.route(url => url.origin === new URL(supabaseUrl).origin && url.pathname === "/rest/v1/ghi_danh", route => {
    return failEnrollment ? route.fulfill({ status: 503, contentType: "application/json", body: '{"message":"Simulated temporary outage"}' }) : route.continue();
  });
  await page.reload();
  await page.getByRole("alert").waitFor();
  assert.equal(await page.getByRole("heading", { name: "Bắt đầu bộ sưu tập kiến thức của bạn" }).count(), 0);
  failEnrollment = false;
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await page.getByRole("heading", { name: "[DEMO] Khóa học Digital Art mẫu cho giáo viên", exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log("PASS query failure shows error, not empty state; retry restores real course");
} finally {
  await browser?.close();
  if (session?.access_token) await fetch(`${supabaseUrl}/auth/v1/logout?scope=local`, {
    method: "POST", headers: { apikey: key, Authorization: `Bearer ${session.access_token}` },
  });
  if (process.platform === "win32") await new Promise(done => {
    const stop = spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }); stop.on("close", done);
  }); else server.kill("SIGTERM");
}
