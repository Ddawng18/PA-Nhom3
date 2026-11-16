// All backend responses are fixtures; this test never writes production data.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const port = await new Promise(resolve => {
  const socket = createServer(); socket.listen(0, "127.0.0.1", () => {
    const port = socket.address().port; socket.close(() => resolve(port));
  });
});
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: fileURLToPath(new URL("../", import.meta.url)), windowsHide: true, stdio: "ignore",
  env: { ...process.env, VITE_API_URL: "http://localhost:4174" },
});
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage(); page.setDefaultTimeout(10000);
  await page.route(/\/src\/auth\/useAuth\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: "export function useAuth(){return {user:null,session:{access_token:'fixture'},loading:false}}" }));
  await page.route("**/__admin-test.html", route => route.fulfill({ contentType: "text/html", body: `
    <div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
    </script><script type="module" src="/tests/admin-refresh.fixture.jsx"></script>` }));
  let user = { id: "user-1", email: "student@example.test", displayName: "Test User", role: "student", isLocked: false, lockVersion: 1 };
  let usersGets = 0, courseGets = 0, approved = false;
  await page.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    let data = {};
    if (path === "/api/admin/users") { usersGets++; data = { items: [user], totalCount: 21 }; }
    else if (path.endsWith("/lock")) {
      const body = request.postDataJSON(); assert.equal(body.expectedVersion, user.lockVersion);
      user = { ...user, isLocked: body.isLocked, lockVersion: user.lockVersion + 1 }; data = user;
    } else if (path === "/api/admin/courses") {
      courseGets++; data = { items: approved ? [] : [{ id: 1, teacherId: "teacher", title: "Pending Course", teacherName: "Teacher", teacherEmail: null,
        level: "CO_BAN", topic: "Art", status: "CHO_DUYET", chapterCount: 1, createdAt: new Date().toISOString() }], totalCount: approved ? 0 : 1 };
    } else if (path === "/api/admin/teacher-profiles") data = { items: [], total: 0, page: 1, pageSize: 20 };
    else if (path.endsWith("/approve")) { approved = true; data = { id: 1, status: "DA_DANG", reviewedAt: new Date().toISOString() }; }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
  });
  page.on("dialog", dialog => dialog.type() === "prompt" ? dialog.accept("Reason for testing lock action") : dialog.accept());
  await page.goto(`${origin}/__admin-test.html`);
  await page.getByText("Test User", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Sau", exact: true }).click();
  await page.getByText("Trang 2", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Khóa", exact: true }).waitFor();
  const beforeLock = usersGets;
  await page.getByRole("button", { name: "Khóa", exact: true }).click();
  await page.getByRole("button", { name: "Mở khóa", exact: true }).waitFor();
  assert.equal(usersGets, beforeLock);
  assert.equal(await page.getByText("Trang 2", { exact: true }).count(), 1);
  await page.getByRole("button", { name: "Mở khóa", exact: true }).click();
  await page.getByRole("button", { name: "Khóa", exact: true }).waitFor();
  await Promise.all([
    page.waitForResponse(response => response.url().includes("/api/admin/users") && response.request().method() === "GET"),
    page.getByRole("button", { name: "Tải lại dữ liệu", exact: true }).click(),
  ]);
  assert.equal(usersGets, beforeLock + 1);
  assert.equal(await page.getByText("Trang 2", { exact: true }).count(), 1);
  console.log("PASS lock/unlock updates locally with current versions; manual reload preserves page");
  await page.getByRole("button", { name: "Duyệt khóa học", exact: true }).click();
  await page.getByText("Pending Course", { exact: true }).waitFor();
  const beforeApprove = courseGets;
  await page.getByRole("button", { name: "Duyệt đăng", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
  await page.getByText("Không có khóa học nào đang chờ duyệt.", { exact: true }).waitFor();
  await page.evaluate(() => { window.dispatchEvent(new window.Event("focus")); document.dispatchEvent(new window.Event("visibilitychange")); });
  assert.equal(courseGets, beforeApprove);
  await Promise.all([
    page.waitForResponse(response => response.url().includes("/api/admin/courses") && response.request().method() === "GET"),
    page.getByRole("button", { name: "Tải lại dữ liệu", exact: true }).click(),
  ]);
  assert.equal(courseGets, beforeApprove + 1);
  console.log("PASS approval updates locally; focus does not reload; manual reload fetches current data");
} finally {
  await browser?.close();
  if (process.platform === "win32") await new Promise(resolve => {
    spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("close", resolve);
  }); else server.kill();
}
