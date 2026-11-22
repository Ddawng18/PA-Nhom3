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
    body: "export function useAuth(){return {user:{id:'teacher-1',email:'teacher@example.test',user_metadata:{display_name:'Giáo viên mẫu'}},session:{access_token:'fixture'},loading:false,signOut:async()=>({error:null}),resetPassword:async()=>({error:null})}}",
  }));
  await page.route(/\/src\/hooks\/useUserRole\.ts(?:\?|$)/, route => route.fulfill({
    contentType: "application/javascript",
    body: "export function useUserRole(){return {role:'teacher',loading:false,error:null}}",
  }));
  await page.route(/\/src\/hooks\/useTeacherApproval\.ts(?:\?|$)/, route => route.fulfill({
    contentType: "application/javascript",
    body: "export function useTeacherApproval(){return {status:'DA_DUYET',loading:false,error:null,retry:()=>{}}}",
  }));
  await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, route => route.fulfill({
    contentType: "application/javascript",
    body: "export const supabase=null; export const isSupabaseConfigured=false; export const getGoogleProviderStatus=async()=>false;",
  }));

  await page.goto(origin + "/teacher/courses/new", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Tạo khóa học" }).waitFor();
  await page.getByRole("heading", { name: "Chọn mẫu khóa học" }).waitFor();
  await page.getByRole("button", { name: /Minh họa nhân vật/ }).click();
  assert.equal(await page.locator("#course-title").inputValue(), "Minh họa nhân vật");
  assert.match(await page.getByRole("button", { name: /Nội dung bài học/ }).innerText(), /2 chương/);
  assert.match(await page.locator(".teacher-publish-checklist").innerText(), /\/6 mục/);
  assert.match(await page.locator("#course-outcomes").inputValue(), /Dựng hình|silhouette/i);
  assert.match(await page.locator("#course-sample-feedback").inputValue(), /Bài luyện/);
  assert.equal(await page.locator("#course-cover-style").inputValue(), "auto");

  await page.getByRole("button", { name: "Xem trước" }).click();
  await page.locator(".teacher-preview-course").waitFor();
  assert.match(await page.locator(".teacher-preview-course").innerText(), /Minh họa nhân vật/);
  assert.match(await page.locator(".teacher-preview-course").innerText(), /Bạn sẽ luyện được gì/);
  assert.match(await page.locator(".teacher-preview-course").innerText(), /2 chương/);

  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `teacher authoring ${width}px overflow`);
  }

  console.log("PASS teacher template picker, checklist and live public-page preview");
} finally {
  await browser?.close();
  server.kill();
}
