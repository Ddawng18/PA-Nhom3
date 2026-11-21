// Isolated UI regression: all API/auth responses are fixtures, no database writes.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const port = await new Promise(resolve => {
  const socket = createServer();
  socket.listen(0, "127.0.0.1", () => {
    const port = socket.address().port;
    socket.close(() => resolve(port));
  });
});
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: decodeURI(root), windowsHide: true, stdio: "ignore",
  env: { ...process.env, VITE_API_URL: "http://localhost:4174" },
});
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  const user = { id: "teacher-fixture", email: "teacher@example.test", user_metadata: {} };
  await page.route(/\/src\/auth\/useAuth\.ts(?:\?|$)/, route => route.fulfill({
    contentType: "application/javascript",
    body: `export function useAuth(){return {user:${JSON.stringify(user)},session:{access_token:'fixture-token'},loading:false}}`,
  }));
  await page.route(/\/src\/hooks\/useUserRole\.ts(?:\?|$)/, route => route.fulfill({
    contentType: "application/javascript", body: "export function useUserRole(){return {role:'teacher',loading:false}}",
  }));
  await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, route => route.fulfill({
    contentType: "application/javascript",
    body: "export const supabase={from:()=>({select:()=>Promise.resolve({data:[],error:null})})};",
  }));
  await page.route("**/__editor-test.html", route => route.fulfill({
    contentType: "text/html",
    body: `<div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type;
      window.__vite_plugin_react_preamble_installed__=true;
    </script><script type="module" src="/tests/course-review.fixture.jsx"></script>`,
  }));
  const calls = [];
  let failSave = false;
  let course;
  let snapshot = { version: "v0", chapters: [], lessons: [], assignments: [], attachments: [], rubrics: [] };
  await page.route("**/api/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    const body = request.postDataJSON();
    calls.push({ path, method, body });
    let data = {};
    if (method === "POST" && path === "/api/courses") {
      course = { ...body, ma_khoa_hoc: 101, ma_giao_vien: user.id, trang_thai: "NHAP", ngay_tao: new Date().toISOString(), anh_dai_dien: body.anh_dai_dien || null };
      data = course;
    } else if (path.endsWith("/editor/version")) data = { version: snapshot.version };
    else if (method === "PUT" && path.endsWith("/editor")) {
      if (failSave) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Lưu tạm thời thất bại" }) });
      course = { ...course, ...body.courseInfo };
      snapshot = { ...snapshot, version: "v1",
        chapters: body.chapters.map((row, i) => ({ ma_chuong: i + 1, ma_khoa_hoc: 101, tieu_de: row.title, thu_tu: row.order })),
        lessons: body.lessons.map((row, i) => ({ ma_bai_hoc: i + 1, ma_chuong: 1, tieu_de: row.title, thu_tu: row.order, noi_dung_van_ban: row.textContent, duong_dan_anh: row.imagePath, lien_ket_video: row.videoUrl, bat_buoc: row.required })),
      };
      data = { courseId: 101, chapters: snapshot.chapters.length, lessons: snapshot.lessons.length,
        chapterIds: snapshot.chapters.map(row => row.ma_chuong), lessonIds: snapshot.lessons.map(row => row.ma_bai_hoc), assignmentIds: [], version: snapshot.version };
    } else if (method === "POST" && path.endsWith("/submit")) course.trang_thai = "CHO_DUYET";
    else if (path.endsWith("/editor")) data = snapshot;
    else if (path === "/api/courses/101") data = course;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
  });
  const pageErrors = [];
  page.on("pageerror", error => { pageErrors.push(error.message); console.error(error.message); });
  await page.goto(`${origin}/__editor-test.html`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("#course-title").fill("Khóa học thử nghiệm");
  await page.locator("#course-description").fill("Mô tả nội dung khóa học đầy đủ để kiểm tra lưu và gửi xét duyệt thành công.");
  await page.locator("#course-level").selectOption("CO_BAN");
  await page.locator("#course-topic").fill("Hội họa");
  await page.getByRole("button", { name: /Nội dung bài học/ }).click();
  await page.getByRole("button", { name: "Thêm chương", exact: true }).click();
  await page.getByRole("button", { name: "Lưu toàn bộ", exact: true }).first().click();
  assert.equal(await page.locator("#chapter-title").getAttribute("aria-invalid"), "true");
  await page.locator("#chapter-title").fill("Chương đã nhập tiêu đề");
  assert.equal(await page.locator("#chapter-title").getAttribute("aria-invalid"), "false");
  await page.getByRole("button", { name: /^\+ Thêm bài học vào/ }).click();
  await page.locator("#lesson-title").fill("Bài học đầu tiên");
  await page.getByRole("button", { name: "Lưu toàn bộ", exact: true }).first().click();
  await page.getByRole("alert").filter({ hasText: "Bài học cần có nội dung văn bản, ảnh hoặc video." }).waitFor();
  await page.locator("#lesson-text").fill("Nội dung bài học để gửi xét duyệt.");
  assert.equal(await page.getByRole("alert").count(), 0);
  console.log("PASS chapter errors clear on edit; lesson validation points to the lesson");

  const opener = page.getByRole("button", { name: "Gửi duyệt", exact: true });
  await opener.click();
  const confirmation = page.getByRole("dialog");
  await confirmation.waitFor();
  assert.equal(await confirmation.getByRole("button", { name: "Hủy", exact: true }).evaluate(button => button === document.activeElement), true);
  await page.keyboard.press("Tab");
  assert.equal(await confirmation.getByRole("button", { name: "Xác nhận", exact: true }).evaluate(button => button === document.activeElement), true);
  await page.keyboard.press("Escape");
  await confirmation.waitFor({ state: "hidden" });
  assert.equal(await opener.evaluate(button => button === document.activeElement), true);
  console.log("PASS course confirmation keyboard focus, Escape and focus return");

  async function submit() {
    await page.getByRole("button", { name: "Gửi duyệt", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: /Xác nhận/ }).click();
  }
  failSave = true;
  await submit();
  await page.getByText("Lưu tạm thời thất bại", { exact: true }).waitFor();
  assert.equal(calls.filter(call => call.path.endsWith("/submit")).length, 0);
  assert.equal(await page.locator("#lesson-text").inputValue(), "Nội dung bài học để gửi xét duyệt.");
  console.log("PASS failed save retains draft and never submits for review");
  failSave = false;
  await submit();
  await page.getByText("Đã gửi khóa học để xét duyệt", { exact: true }).waitFor();
  const writes = calls.filter(call => call.method === "POST" || call.method === "PUT");
  assert.equal(writes.at(-2).method, "PUT");
  assert.equal(writes.at(-2).body.lessons[0].title, "Bài học đầu tiên");
  assert.equal(writes.at(-1).path, "/api/courses/101/submit");
  assert.equal(calls.filter(call => call.method === "POST" && call.path === "/api/courses").length, 1);
  assert.deepEqual(pageErrors, []);
  console.log("PASS new course saves latest content before submission; retry reuses draft ID");
} finally {
  await browser?.close();
  if (process.platform === "win32") await new Promise(resolve => {
    spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("close", resolve);
  });
  else server.kill();
}
