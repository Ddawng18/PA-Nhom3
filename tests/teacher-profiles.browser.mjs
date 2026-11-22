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
  env: { ...process.env, VITE_API_URL: "http://localhost:4174" },
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
  await page.goto(origin + "/", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Những người đồng hành mẫu" }).waitFor();
  assert.equal(await page.locator(".teacher-showcase-card").count(), 3);
  assert.ok((await page.getByText("Hồ sơ mẫu").count()) >= 3);
  assert.equal(await page.getByRole("link", { name: /Xem hồ sơ mẫu/ }).count(), 3);

  assert.ok((await page.locator('a[href="/teachers/nmratist"]').count()) >= 1);
  await page.goto(origin + "/teachers/nmratist", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "NmRAtist", exact: true }).waitFor();
  const main = page.getByRole("main");
  const text = await main.innerText();
  assert.match(text, /HỒ SƠ GIẢNG VIÊN MINH HỌA/);
  assert.match(text, /Dữ liệu mẫu/i);
  assert.match(text, /Tác phẩm mẫu/);
  assert.match(text, /Lớp học minh họa/);
  assert.match(text, /không phải hồ sơ giáo viên thật/i);
  assert.doesNotMatch(text, /đã xác minh/i);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${width}px overflow`);
  }

  await page.goto(origin + "/teachers/khong-ton-tai", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Không tìm thấy hồ sơ mẫu" }).waitFor();

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const adminPage = await adminContext.newPage();
  adminPage.on("dialog", dialog => dialog.accept());
  await adminPage.addInitScript(() => localStorage.setItem("linea-cookie-consent-v1", "accepted"));
  await adminPage.route(/\/src\/auth\/useAuth\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: "export function useAuth(){return {user:{id:'admin-1',email:'admin@example.test',user_metadata:{}},session:{access_token:'fixture'},loading:false,signOut:async()=>({error:null}),resetPassword:async()=>({error:null})}}" }));
  await adminPage.route(/\/src\/hooks\/useUserRole\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: "export function useUserRole(){return {role:'admin',loading:false,error:null}}" }));
  await adminPage.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: "export const supabase=null; export const isSupabaseConfigured=false; export const getGoogleProviderStatus=async()=>false;" }));
  await adminPage.goto(origin + "/admin/demo-teachers", { waitUntil: "networkidle" });
  await adminPage.getByRole("heading", { name: "Hồ sơ giảng viên mẫu" }).waitFor();
  for (const width of [390, 768, 1440]) {
    await adminPage.setViewportSize({ width, height: 1000 });
    assert.equal(await adminPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `admin list ${width}px overflow`);
  }
  const nmratistCard = adminPage.locator(".demo-teacher-admin-card").filter({ hasText: "NmRAtist" });
  await nmratistCard.getByRole("link", { name: "Chỉnh sửa hồ sơ" }).click();
  await adminPage.waitForURL("**/admin/demo-teachers/nmratist");
  await adminPage.getByRole("heading", { name: "Chỉnh sửa hồ sơ mẫu" }).waitFor();
  for (const width of [390, 768, 1440]) {
    await adminPage.setViewportSize({ width, height: 1000 });
    assert.equal(await adminPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `admin editor ${width}px overflow`);
  }
  await adminPage.getByLabel("Tên hiển thị").fill("NmRAtist Studio");
  await adminPage.getByLabel("Tiêu đề chuyên môn").fill("Character illustration studio");
  await adminPage.getByRole("button", { name: "Lưu thay đổi" }).click();
  await adminPage.getByText("Đã lưu hồ sơ mẫu của NmRAtist Studio").waitFor();

  await adminPage.goto(origin + "/teachers/nmratist", { waitUntil: "networkidle" });
  await adminPage.getByRole("heading", { name: "NmRAtist Studio", exact: true }).waitFor();
  assert.match(await adminPage.getByRole("main").innerText(), /Character illustration studio/);

  const publicPage = await adminContext.newPage();
  await publicPage.addInitScript(() => localStorage.setItem("linea-cookie-consent-v1", "accepted"));
  await publicPage.route(/\/src\/auth\/useAuth\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: "export function useAuth(){return {user:null,session:null,loading:false}}" }));
  await publicPage.route(/\/src\/hooks\/useUserRole\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: "export function useUserRole(){return {role:null,loading:false,error:null}}" }));
  await publicPage.goto(origin + "/", { waitUntil: "networkidle" });
  await publicPage.getByRole("heading", { name: "NmRAtist Studio", exact: true }).waitFor();
  await publicPage.close();

  await adminPage.goto(origin + "/admin/demo-teachers", { waitUntil: "networkidle" });
  const editedCard = adminPage.locator(".demo-teacher-admin-card").filter({ hasText: "NmRAtist Studio" });
  await editedCard.getByText("Đã chỉnh sửa").waitFor();
  await editedCard.getByRole("link", { name: "Chỉnh sửa hồ sơ" }).click();
  await adminPage.waitForURL("**/admin/demo-teachers/nmratist");
  await adminPage.getByRole("button", { name: "Đặt lại hồ sơ này" }).click();
  await adminPage.getByText("Đã đặt lại hồ sơ của NmRAtist Studio").waitFor();
  assert.equal(await adminPage.getByLabel("Tên hiển thị").inputValue(), "NmRAtist");
  await adminPage.goto(origin + "/teachers/nmratist", { waitUntil: "networkidle" });
  await adminPage.getByRole("heading", { name: "NmRAtist", exact: true }).waitFor();

  console.log("PASS demo teacher showcase, profile labels, disclaimer, not-found and responsive layout");
  console.log("PASS demo teacher profiles are editable, persist locally, update public pages and reset");
} finally {
  await browser?.close();
  server.kill();
}
