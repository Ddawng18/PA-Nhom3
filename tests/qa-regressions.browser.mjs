// QA-01/03/04/06: fixture data, no live account or persisted server writes.
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
  env: { ...process.env, VITE_API_URL: origin },
});
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("linea-cookie-consent-v1", "accepted"));
  await page.route(/\/src\/auth\/useAuth\.ts(?:\?|$)/, route => route.fulfill({
    contentType: "application/javascript",
    body: "export function useAuth(){return {user:{id:'qa-user',email:'qa@example.test',user_metadata:{}},session:{access_token:'fixture'},loading:false}}",
  }));
  await page.route(/\/src\/hooks\/useUserRole\.ts(?:\?|$)/, route => route.fulfill({
    contentType: "application/javascript", body: "export function useUserRole(){return {role:'student',loading:false,error:null}}",
  }));
  await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, route => route.fulfill({
    contentType: "application/javascript",
    body: "export const supabase=null; export const isSupabaseConfigured=false; export const getGoogleProviderStatus=async()=>false;",
  }));
  let prices = [0];
  const post = { id: 7, title: "Bài viết dài", body: "Minh họa và hình khối.\n".repeat(120), author: "QA", createdAt: "2026-11-23T00:00:00Z" };
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data = [];
    if (path === "/api/catalog/courses") data = { items: [], page: 1, pageSize: 12, totalCount: 0, chu_de: [] };
    if (path === "/api/community/posts") data = [post];
    if (path === "/api/community/posts/7") data = post;
    if (path === "/api/cart" || path === "/api/cart/quote") data = {
      items: prices.map((priceVnd, i) => ({ courseId: i + 1, title: `Khóa ${i + 1}`, priceVnd, level: "CO_BAN", available: true, enrolled: false })),
      totalVnd: prices.reduce((a, b) => a + b, 0), paidCount: prices.filter(p => p > 0).length,
      freeCount: prices.filter(p => p === 0).length, blockedCount: 0,
    };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
  });

  await page.goto(origin + "/progress");
  const explore = page.getByRole("link", { name: "Khám phá khóa học để bắt đầu" });
  await explore.waitFor();
  await explore.click();
  await page.waitForURL(/\/courses$/);
  console.log("PASS QA-01 empty progress links directly to catalog");

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(origin + "/community");
    const content = page.locator(".community-post-content");
    await content.waitFor();
    assert.ok((await content.innerText()).length <= 401);
    assert.ok((await content.boundingBox()).height < 200);
    const more = page.getByRole("link", { name: "Đọc tiếp: Bài viết dài" });
    const report = page.getByRole("button", { name: "Báo cáo bài viết", exact: true });
    await report.waitFor();
    const contentBox = await content.boundingBox();
    assert.ok((await report.boundingBox()).y - contentBox.y < 300);
    await more.click();
    await page.waitForURL(/\/community\/7$/);
    await page.waitForFunction(body => document.querySelector(".community-post-content")?.textContent === body, post.body);
    assert.equal(await page.getByRole("link", { name: "Đọc tiếp: Bài viết dài" }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  }
  console.log("PASS QA-03 bounded desktop/mobile preview, nearby actions and complete detail");

  for (const scenario of [[0], [100000], [0, 100000]]) {
    prices = scenario;
    await page.goto(origin + "/cart");
    await page.getByRole("heading", { name: "Khóa 1", exact: true }).waitFor();
    const free = scenario.every(price => price === 0);
    await page.getByRole("button", { name: free ? "Ghi danh khóa học" : "Thanh toán một lần", exact: true }).waitFor();
    assert.equal(await page.locator(".cart-item-topic").first().innerText(), "Cơ bản");
  }
  console.log("PASS QA-04 signed-in free, paid and mixed carts with translated levels");

  await page.goto(origin + "/artworks");
  await page.getByRole("heading", { name: "Thư viện tác phẩm chưa khả dụng" }).waitFor();
  await page.getByText(/Bản vẽ Studio và bài luyện tập đã nộp chưa được đồng bộ/).waitFor();
  assert.deepEqual(errors, []);
  console.log("PASS QA-06 artwork page accurately describes local storage");
} finally {
  await browser?.close();
  if (process.platform === "win32") await new Promise(resolve => {
    spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("close", resolve);
  }); else server.kill();
}
