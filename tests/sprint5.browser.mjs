// Local browser integration: real API + temporary SQLite; only Supabase identity reads are mocked.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { createServer } from "node:net";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "..");
const temp = await mkdtemp(join(tmpdir(), "linea-sprint5-"));
const artifacts = join(root, "test-results", "sprint5");
await mkdir(artifacts, { recursive: true });
const freePort = () => new Promise(resolvePort => {
  const server = createServer(); server.listen(0, "127.0.0.1", () => {
    const port = server.address().port; server.close(() => resolvePort(port));
  });
});
const api = `http://127.0.0.1:${await freePort()}`;
const app = `http://127.0.0.1:${await freePort()}`;
const children = [];
const messages = [];
let browser;
const record = message => { messages.push(message); console.log(message); };
function start(command, args, env) {
  const child = spawn(command, args, { cwd: root, env: { ...process.env, ...env }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let log = ""; child.stdout.on("data", data => { log = (log + data).slice(-12000); }); child.stderr.on("data", data => { log = (log + data).slice(-12000); });
  children.push(child); return () => log;
}
async function ready(url, log) {
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(url)).ok) return; } catch { /* starting */ }
    await new Promise(resolveWait => setTimeout(resolveWait, 500));
  }
  throw new Error(`Local service did not start: ${log()}`);
}
async function request(path, method = "GET", body, token) {
  const response = await fetch(api + path, { method, headers: {
    ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => null);
  assert.ok(response.ok, `${method} ${path}: ${response.status} ${JSON.stringify(data)}`); return data;
}
const password = "TestPass123!";
async function contextFor(login, role) {
  const context = await browser.newContext({ viewport: { width: 1365, height: 950 } });
  const user = { ...login.user, id: login.user.id, email: login.user.email, aud: "authenticated", role: "authenticated", user_metadata: { display_name: login.user.displayName }, app_metadata: { provider: "email", providers: ["email"] }, created_at: new Date().toISOString() };
  await context.addInitScript(({ session }) => localStorage.setItem("sb-linea-e2e-auth-token", JSON.stringify(session)), {
    session: { access_token: login.accessToken, refresh_token: "local-test-refresh", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user },
  });
  await context.route("https://linea-e2e.supabase.co/**", async route => {
    const url = new URL(route.request().url());
    const data = url.pathname.startsWith("/auth/") ? user : url.pathname.endsWith("/nguoi_dung")
      ? [{ id: user.id, role, display_name: login.user.displayName }] : [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
  });
  return context;
}
try {
  const apiLog = start("dotnet", ["run", "--no-build", "--project", "server/Linea.Api", "--no-launch-profile"], {
    DOTNET_ROLL_FORWARD: "Major", ASPNETCORE_ENVIRONMENT: "Development", ASPNETCORE_URLS: api,
    AUTH_MODE: "legacy", JWT_KEY: "browser-test-only-signing-key-at-least-32-bytes", DB_CONNECTION: `Data Source=${join(temp, "browser.db")}`,
    SUPABASE_DB_URL: "", SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "", CLIENT_ORIGIN: app,
    SEED_ADMIN_EMAIL: "browser-admin@linea.local", SEED_ADMIN_PASSWORD: password,
    TEACHER_DOCS_PATH: join(temp, "portfolio"), EMAIL_OUTBOX_PATH: join(temp, "email"),
    SIGNED_URL_KEY: "browser-test-only-signed-url-key-at-least-32-bytes",
  });
  const appLog = start(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", new URL(app).port], {
    VITE_API_URL: api, VITE_SUPABASE_URL: "https://linea-e2e.supabase.co", VITE_SUPABASE_ANON_KEY: "local-test-public-key",
  });
  await Promise.all([ready(api + "/api/health", apiLog), ready(app, appLog)]);
  await request("/api/auth/register", "POST", { email: "browser-student@linea.local", password, displayName: "Browser Student" });
  const student = await request("/api/auth/login", "POST", { email: "browser-student@linea.local", password });
  const admin = await request("/api/auth/login", "POST", { email: "browser-admin@linea.local", password });
  browser = await chromium.launch({ headless: true });
  const studentContext = await contextFor(student, "student");
  const page = await studentContext.newPage();
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(app + "/teacher/onboarding");
  await page.getByLabel("Giới thiệu bản thân").fill("Tôi giảng dạy minh họa số và chia sẻ kinh nghiệm sáng tác cho người mới bắt đầu.");
  await page.getByLabel("Kinh nghiệm giảng dạy và sáng tác").fill("Năm năm sáng tác và hướng dẫn digital art.");
  await page.locator('input[type="file"]').setInputFiles({ name: "portfolio.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=", "base64") });
  await page.getByRole("button", { name: "Gửi hồ sơ xét duyệt", exact: true }).click();
  await page.getByRole("heading", { name: "Đang chờ duyệt", exact: true }).waitFor();
  assert.ok(await page.getByRole("button", { name: "Gửi lại hồ sơ", exact: true }).isDisabled());
  await page.screenshot({ path: join(artifacts, "01-pending.png"), fullPage: true });
  record("PASS browser: submit real portfolio/application; pending application is locked");

  const adminContext = await contextFor(admin, "admin"); const adminPage = await adminContext.newPage();
  adminPage.on("pageerror", error => errors.push(error.message));
  await adminPage.goto(app + "/admin/teachers");
  await adminPage.waitForURL("**/settings?tab=phe-duyet&muc=giao-vien");
  await adminPage.getByText("Browser Student", { exact: true }).first().waitFor();
  // Confirm through the same UI used by the Settings entry point.
  const approveButton = adminPage.getByRole("button", { name: /^Duyệt$/ }).first();
  await approveButton.click();
  const dialog = adminPage.getByRole("dialog");
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  const profile = await request("/api/admin/teacher-profiles?status=DA_DUYET", "GET", undefined, admin.accessToken);
  assert.equal(profile.items.length, 1);
  record("PASS browser: admin entry redirects to unified approval UI; approval updates backend");
  const teacher = await request("/api/auth/login", "POST", { email: "browser-student@linea.local", password });
  assert.equal(teacher.user.role, "teacher");
  const teacherContext = await contextFor(teacher, "teacher"); const teacherPage = await teacherContext.newPage();
  await teacherPage.goto(app + "/teacher/onboarding");
  await teacherPage.getByRole("heading", { name: "Đã được duyệt", exact: true }).waitFor();
  await teacherPage.screenshot({ path: join(artifacts, "02-approved.png"), fullPage: true });
  record("PASS browser: approved teacher sees status and course creation link");

  await teacherPage.goto(app + "/teacher/courses/new");
  await teacherPage.locator("#course-title").fill("Browser digital art course");
  await teacherPage.locator("#course-description").fill("Khóa học minh họa dành cho người mới bắt đầu với các kỹ thuật sáng tác digital art nền tảng.");
  await teacherPage.locator("#course-level").selectOption("CO_BAN");
  await teacherPage.locator("#course-topic").fill("Vẽ cơ bản");
  await teacherPage.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await teacherPage.waitForURL(/\/teacher\/courses\/\d+\/edit$/);
  await teacherPage.locator("#course-title").waitFor();
  await teacherPage.waitForFunction(() => document.querySelector("#course-title")?.value === "Browser digital art course");
  await teacherPage.locator("#course-title").fill("Updated browser digital art course");
  const updated = teacherPage.waitForResponse(response => response.url().startsWith(api + "/api/courses/") && response.request().method() === "PUT" && response.status() === 200);
  await teacherPage.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  assert.equal((await (await updated).json()).tieu_de, "Updated browser digital art course");
  await teacherPage.goto(app + "/my-courses");
  await teacherPage.getByRole("heading", { name: "Updated browser digital art course", exact: true }).waitFor();
  await teacherPage.screenshot({ path: join(artifacts, "04-course-list.png"), fullPage: true });
  record("PASS browser: create/edit draft through canonical API and display numeric-ID course in list");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(artifacts, "03-mobile.png"), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, "mobile horizontal overflow");
  assert.deepEqual(errors, []);
  record("PASS browser: mobile layout has no horizontal overflow; no page errors");
  const unavailable = await studentContext.newPage();
  await unavailable.route(api + "/api/teacher/profile/me", route => route.fulfill({ status: 404, contentType: "application/json", body: "{}" }));
  await unavailable.goto(app + "/teacher/onboarding");
  await unavailable.getByRole("button", { name: "Tải lại hồ sơ", exact: true }).waitFor();
  assert.ok(await unavailable.getByRole("button", { name: "Gửi hồ sơ xét duyệt", exact: true }).isDisabled());
  record("PASS browser: unavailable backend route is an error; blank application cannot be submitted");
} catch (error) {
  if (browser) {
    let index = 0;
    for (const context of browser.contexts()) for (const page of context.pages()) {
      await page.screenshot({ path: join(artifacts, `failure-${index++}.png`), fullPage: true }).catch(() => {});
    }
  }
  throw error;
} finally {
  await browser?.close();
  for (const child of children.reverse()) {
    if (process.platform === "win32") await new Promise(done => {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }); killer.on("close", done);
    }); else child.kill("SIGTERM");
  }
  await writeFile(join(artifacts, "results.txt"), messages.join("\n") + "\n");
  assert.ok(resolve(temp).startsWith(resolve(tmpdir()) + sep) && temp.split(sep).at(-1).startsWith("linea-sprint5-"));
  await rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
