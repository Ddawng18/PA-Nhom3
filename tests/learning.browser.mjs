// Learning regression: overview, lesson content, mobile layout and API error state.
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
const course = {
  ma_khoa_hoc: 34, tieu_de: "Màu nước nhập môn", mo_ta: "Khóa học thử", cap_do: "CO_BAN", chu_de: "Màu nước",
  anh_dai_dien: null, da_ghi_danh: true, phan_tram: 0, trang_thai_ghi_danh: "DANG_HOC",
  chuong: [{ ma_chuong: 1, tieu_de: "Chương 1", thu_tu: 1, bai_hoc: [{ ma_bai_hoc: 1, tieu_de: "Bài mở đầu", thu_tu: 1, trang_thai: "CHUA_HOC" }] }],
};
const lesson = {
  ma_bai_hoc: 1, ma_khoa_hoc: 34, ma_chuong: 1, tieu_de: "Bài mở đầu",
  noi_dung_van_ban: "Nội dung bài học thử nghiệm.", duong_dan_anh: null, lien_ket_video: null,
  bat_buoc: true, trang_thai: "CHUA_HOC", phan_tram: 0,
};
let browser;
async function fixtures(page, failLearning = false) {
  await page.route(/\/src\/auth\/useAuth\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: "export function useAuth(){return {user:{id:'student-1',email:'student@example.test',user_metadata:{}},session:{access_token:'fixture'},loading:false}}" }));
  await page.route(/\/src\/hooks\/useUserRole\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: "export function useUserRole(){return {role:'student',loading:false,error:null}}" }));
  await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: "export const supabase=null; export const isSupabaseConfigured=false; export const getGoogleProviderStatus=async()=>false;" }));
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/courses/34/learning") {
      if (failLearning) return route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(course) });
    }
    if (path === "/api/courses/34/lessons/1") return route.fulfill({ contentType: "application/json", body: JSON.stringify(lesson) });
    return route.fulfill({ contentType: "application/json", body: "[]" });
  });
}
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(30000);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await fixtures(page);
  await page.goto(`${origin}/courses/34/learn`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByRole("heading", { name: "Màu nước nhập môn" }).waitFor();
  await page.getByRole("link", { name: "Bài mở đầu" }).first().click();
  await page.waitForURL("**/courses/34/learn/1");
  await page.getByText("Nội dung bài học thử nghiệm.").waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);

  const failing = await browser.newPage({ viewport: { width: 390, height: 844 } });
  failing.setDefaultTimeout(30000);
  await fixtures(failing, true);
  await failing.goto(`${origin}/courses/34/learn`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await failing.getByRole("button", { name: "Thử lại", exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log("PASS learning overview, lesson content, API error state and 390px layout");
} finally {
  await browser?.close();
  if (process.platform === "win32") await new Promise(resolve => {
    spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("close", resolve);
  }); else server.kill();
}
