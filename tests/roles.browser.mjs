// Role workspace regression: teacher overview/queue/students and admin overview/audit/moderation.
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
  env: { ...process.env, VITE_API_URL: "http://localhost:4174" },
});
const now = "2026-11-21T07:00:00.000Z";
const overview = {
  counts: { users: 12, teachers: 3, pendingTeachers: 1, courses: 5, pendingCourses: 2, hiddenCourses: 1, posts: 8, hiddenPosts: 1, openReports: 1, orders: 4, revenueVnd: 1200000 },
  audit: [{ id: 1, objectType: "KHOA_HOC", objectId: "5", previousStatus: "CHO_DUYET", status: "DA_DANG", reason: null, actor: "Quản trị viên", occurredAt: now }],
  reports: [{ id: 1, postId: 7, reason: "Nội dung đạo nhái", status: "OPEN", createdAt: now }],
};
const teacherOverview = {
  totals: { courses: 2, published: 1, drafts: 1, pendingSubmissions: 1, gradedSubmissions: 3, students: 4 },
  courses: [{ id: 5, title: "Màu nước cơ bản", status: "DA_DANG", level: "CO_BAN", topic: "Màu nước", createdAt: now, pendingSubmissions: 1 }],
  recentSubmissions: [{ id: 9, status: "CHO_CHAM", updatedAt: now, courseId: 5, studentId: "student-1", studentName: "Mai Anh" }],
};
const queue = { total: 1, page: 1, items: [{ id: 9, courseId: 5, courseTitle: "Màu nước cơ bản", assignmentId: 3, lessonTitle: "Pha màu", prompt: "Vẽ phối màu", studentId: "student-1", studentName: "Mai Anh", status: "CHO_CHAM", submittedAt: now, updatedAt: now, grade: null }] };
const students = { total: 1, page: 1, items: [{ studentId: "student-1", studentName: "Mai Anh", courseId: 5, courseTitle: "Màu nước cơ bản", status: "DANG_HOC", enrolledAt: now, completedAt: null }] };
const report = { id: 1, postId: 7, postTitle: "Tranh thử", postBody: "Nội dung", postStatus: "VISIBLE", author: "Minh Anh", reporter: "Lan", reason: "Nội dung đạo nhái", status: "OPEN", createdAt: now, reviewedAt: null, note: null };

let browser;
async function verifyWorkspace(page, heading) {
  const main = page.getByRole("main");
  await main.getByRole("heading", { name: heading }).waitFor();
  assert.match(await main.ariaSnapshot(), new RegExp(heading));
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${heading}, ${width}px`);
  }
}
async function fixtures(page, role) {
  const user = { id: `${role}-1`, email: `${role}@example.test`, user_metadata: {} };
  await page.route(/\/src\/auth\/useAuth\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: `export function useAuth(){return {user:${JSON.stringify(user)},session:{access_token:'fixture'},loading:false,signOut:async()=>({error:null})}}` }));
  await page.route(/\/src\/hooks\/useUserRole\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: `export function useUserRole(){return {role:'${role}',loading:false,error:null}}` }));
  await page.route(/\/src\/hooks\/useTeacherApproval\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: "export function useTeacherApproval(){return {status:'DA_DUYET',loading:false,error:null,retry:()=>{}}}" }));
  await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: "export const supabase=null; export const isSupabaseConfigured=false; export const getGoogleProviderStatus=async()=>false;" }));
  await page.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    let data = null;
    if (path === "/api/teacher/overview") data = teacherOverview;
    else if (path === "/api/teacher/submissions") data = queue;
    else if (path === "/api/teacher/students") data = students;
    else if (path === "/api/admin/overview") data = overview;
    else if (path === "/api/admin/audit") data = { items: overview.audit, total: 1, page: 1 };
    else if (path === "/api/admin/community/reports") data = [report];
    else if (path.startsWith("/api/admin/community/reports/")) data = { id: 1, action: "HIDE", postStatus: "HIDDEN" };
    else data = [];
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
  });
}
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({ headless: true });
  const teacher = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  teacher.setDefaultTimeout(30000);
  const errors = []; teacher.on("pageerror", error => errors.push(error.message));
  await fixtures(teacher, "teacher");
  await teacher.goto(`${origin}/teacher`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await verifyWorkspace(teacher, "Tổng quan giáo viên");
  await teacher.getByText("Bài chờ chấm gần đây").waitFor();
  const navigation = teacher.locator(".settings-mobile-drawer .settings-navigation");
  const menu = teacher.locator(".settings-nav-toggle");
  assert.equal(await menu.isVisible(), false);
  await teacher.setViewportSize({ width: 390, height: 844 });
  assert.equal(await navigation.isVisible(), false);
  await menu.click();
  assert.equal(await menu.getAttribute("aria-expanded"), "true");
  assert.equal(await teacher.getByRole("dialog", { name: "Menu điều hướng" }).isVisible(), true);
  await navigation.getByRole("link", { name: "Học viên", exact: true }).focus();
  await teacher.keyboard.press("Escape");
  assert.equal(await navigation.isVisible(), false);
  assert.equal(await menu.evaluate(button => button === document.activeElement), true);
  await menu.click();
  await teacher.mouse.click(380, 400);
  assert.equal(await navigation.isVisible(), false);
  await menu.click();
  await teacher.getByRole("link", { name: "Bài chờ chấm", exact: true }).click();
  await teacher.waitForURL("**/teacher/submissions");
  assert.equal(await navigation.isVisible(), false);
  await teacher.getByText("Pha màu").waitFor();
  await verifyWorkspace(teacher, "Bài nộp của học viên");
  await teacher.getByRole("link", { name: "Học viên", exact: true }).click();
  await teacher.waitForURL("**/teacher/students");
  await teacher.getByText("Mai Anh").waitFor();
  await verifyWorkspace(teacher, "Học viên theo khóa học");

  const admin = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  admin.setDefaultTimeout(30000);
  admin.on("pageerror", error => errors.push(error.message));
  await fixtures(admin, "admin");
  await admin.goto(`${origin}/admin`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await verifyWorkspace(admin, "Tổng quan quản trị");
  await admin.getByRole("link", { name: "Nhật ký kiểm toán" }).click();
  await admin.waitForURL("**/admin/audit");
  await admin.getByText("CHO_DUYET → DA_DANG").waitFor();
  await verifyWorkspace(admin, "Lịch sử thao tác quản trị");
  await admin.getByRole("link", { name: "Kiểm duyệt cộng đồng" }).click();
  await admin.waitForURL("**/admin/community");
  await admin.getByText("Tranh thử").waitFor();
  await verifyWorkspace(admin, "Báo cáo bài viết");
  await admin.getByRole("button", { name: "Ẩn bài viết", exact: true }).click();
  await admin.getByText("Đã ẩn bài").first().waitFor();

  const student = await browser.newPage();
  await fixtures(student, "student");
  for (const [page, destination, heading] of [
    [student, "/dashboard", "Sổ học tập"],
    [teacher, "/teacher", "Tổng quan giáo viên"],
    [admin, "/admin", "Tổng quan quản trị"],
  ]) {
    for (const path of ["/", "/dashboard", "/teacher", "/admin"]) {
      await page.goto(origin + path, { waitUntil: "domcontentloaded" });
      await page.waitForURL(origin + destination);
      await page.getByRole("heading", { name: heading, exact: true }).waitFor();
    }
  }
  assert.deepEqual(errors, []);
  console.log("PASS role-specific dashboards, teacher workspace and admin workspace");
} finally {
  await browser?.close();
  if (process.platform === "win32") await new Promise(resolve => {
    spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("close", resolve);
  }); else server.kill();
}
