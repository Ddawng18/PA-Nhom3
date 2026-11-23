import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const port = await new Promise(resolve => {
  const socket = createServer();
  socket.listen(0, "127.0.0.1", () => {
    const value = socket.address().port;
    socket.close(() => resolve(value));
  });
});
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: fileURLToPath(new URL("../", import.meta.url)), windowsHide: true, stdio: "ignore",
  env: { ...process.env, VITE_API_URL: origin, LOCAL_API_PROXY_TARGET: "https://linea-api-6pw5.onrender.com" },
});
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.addInitScript(() => localStorage.setItem("linea-cookie-consent-v1", "accepted"));
  await page.route(/\/src\/auth\/useAuth\.ts(?:\?|$)/, route => route.fulfill({
    contentType: "application/javascript",
    body: "export function useAuth(){const signed=localStorage.getItem('linea-test-signed')==='1';return {user:signed?{id:'student-1',email:'student@example.test',user_metadata:{display_name:'Học viên mẫu'}}:null,session:signed?{access_token:'fixture'}:null,loading:false,configured:true,signUpWithEmail:async()=>{localStorage.setItem('linea-test-signed','1');return {error:null,needsEmailConfirmation:false}},signInWithGoogle:async()=>({error:null}),resendConfirmation:async()=>({error:null}),signOut:async()=>({error:null}),resetPassword:async()=>({error:null})}}",
  }));
  await page.route(/\/src\/hooks\/useUserRole\.ts(?:\?|$)/, route => route.fulfill({
    contentType: "application/javascript",
    body: "export function useUserRole(){return {role:'student',loading:false,error:null}}",
  }));
  await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, route => route.fulfill({
    contentType: "application/javascript",
    body: "export const supabase=null; export const isSupabaseConfigured=false; export const getGoogleProviderStatus=async()=>false;",
  }));

  const catalogCourse = { ma_khoa_hoc: 11, tieu_de: "Màu kỹ thuật số cho minh họa", mo_ta: "Màu sắc", cap_do: "CO_BAN", chu_de: "Màu sắc", anh_dai_dien: null, ma_giao_vien: "x", ten_giao_vien: "ThinhTester", gia_vnd: 0, so_chuong: 1, so_bai_hoc: 1, so_hoc_vien: 0, ngay_tao: "2026-01-01" };
  await page.route("**/api/catalog/courses?**", route => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ items: [catalogCourse], page: 1, pageSize: 12, totalCount: 1, chu_de: [] }),
  }));
  await page.route("**/api/catalog/courses/11", route => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ khoa_hoc: catalogCourse, chuong: [{ ma_chuong: 1, tieu_de: "Chương mở đầu", thu_tu: 1, bai_hoc: [{ ma_bai_hoc: 101, tieu_de: "Bài học đầu tiên", thu_tu: 1, bat_buoc: true }] }], khoa_hoc_cung_chu_de: [] }),
  }));
  await page.route("**/api/courses/11/learning", route => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ ma_khoa_hoc: 11, tieu_de: "Màu kỹ thuật số cho minh họa", mo_ta: "", cap_do: "CO_BAN", chu_de: "Màu sắc", anh_dai_dien: null, da_ghi_danh: true, phan_tram: 0, trang_thai_ghi_danh: "DANG_HOC", chuong: [{ ma_chuong: 1, tieu_de: "Chương mở đầu", thu_tu: 1, bai_hoc: [{ ma_bai_hoc: 101, tieu_de: "Bài học đầu tiên", thu_tu: 1, trang_thai: "CHUA_HOC" }] }] }),
  }));
  await page.route("**/api/courses/11/lessons/101", route => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ ma_bai_hoc: 101, ma_khoa_hoc: 11, ma_chuong: 1, tieu_de: "Bài học đầu tiên", noi_dung_van_ban: "Quan sát khối lớn trước khi thêm chi tiết.", duong_dan_anh: null, lien_ket_video: null, bat_buoc: true, trang_thai: "CHUA_HOC", phan_tram: 0 }),
  }));
  await page.route("**/api/courses/11/lessons/101/progress", route => route.fulfill({ contentType: "application/json", body: "{}" }));

  await page.addInitScript(() => localStorage.setItem("linea-test-signed", "1"));
  await page.goto(origin + "/onboarding", { waitUntil: "networkidle" });  await page.getByRole("heading", { name: "Thiết lập lộ trình của bạn" }).waitFor();
  await page.getByText("Xây nền tảng", { exact: true }).click();
  await page.getByText("30 phút", { exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu bài học đầu tiên" }).click();
  await page.waitForURL(/\/courses\/11\/learn\/101$/);
  await page.getByRole("heading", { name: "Bài học đầu tiên" }).waitFor();
  await page.getByRole("button", { name: "Hoàn thành bài học" }).click();
  await page.getByText(/Đã lưu hoàn thành bài học/).waitFor();
  assert.ok(await page.evaluate(() => localStorage.getItem("linea-learner-profile-v1:student-1")));

  const myCourse = { id: 11, title: "Màu kỹ thuật số cho minh họa", level: "CO_BAN", status: "DANG_HOC", available: true, coverImage: null, percent: 25, totalLessons: 4, completedLessons: 1 };
  const assignment = { id: 5, lessonId: 101, courseId: 11, lessonTitle: "Bài học đầu tiên", prompt: "Vẽ một khối cơ bản.", deadline: new Date(Date.now() + 86400000).toISOString(), required: true, submission: null };
  let dashboardCalls = 0;
  const courseRoute = route => route.fulfill({ contentType: "application/json", body: JSON.stringify([myCourse]) });
  const assignmentRoute = route => route.fulfill({ contentType: "application/json", body: JSON.stringify([assignment]) });
  await page.route("**/api/courses/mine", route => { dashboardCalls += 1; return courseRoute(route); });
  await page.route("**/api/assignments", assignmentRoute);
  await page.goto(origin + "/dashboard", { waitUntil: "networkidle" });
  await page.getByText("Màu kỹ thuật số cho minh họa", { exact: true }).first().waitFor();
  assert.ok((await page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith("linea-dashboard-cache-v1:")))));

  await page.unroute("**/api/courses/mine");
  await page.route("**/api/courses/mine", route => route.fulfill({ status: 500, contentType: "application/json", body: "{}" }));
  await page.route("**/api/assignments", route => route.fulfill({ status: 500, contentType: "application/json", body: "{}" }));
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Màu kỹ thuật số cho minh họa", { exact: true }).first().waitFor();
  assert.match(await page.getByRole("main").innerText(), /dữ liệu lưu gần nhất/i);

  await page.route("**/api/assignments/5/submission", route => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ id: 9, status: "SUBMITTED", submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), grade: null }),
  }));
  await page.goto(origin + "/studio?assignmentId=5&courseId=11&lessonId=101", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Bắt đầu vẽ" }).click();
  await page.getByRole("button", { name: "Nộp vào bài tập" }).click();
  await page.getByText("Đã nộp bản vẽ vào bài tập #5").waitFor();
  assert.ok(dashboardCalls > 0);

  console.log("PASS onboarding, first lesson completion, dashboard cache fallback and Studio assignment submission");
} finally {
  await browser?.close();
  server.kill();
}
