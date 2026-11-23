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
  await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, route => route.fulfill({
    contentType: "application/javascript",
    body: "export const supabase=null; export const isSupabaseConfigured=false; export const getGoogleProviderStatus=async()=>false;",
  }));
  await page.route("**/api/catalog/courses?**", route => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ items: [{ ma_khoa_hoc: 11, tieu_de: "Màu kỹ thuật số cho minh họa", mo_ta: "Màu sắc", cap_do: "CO_BAN", chu_de: "Màu sắc", anh_dai_dien: null, ma_giao_vien: "x", ten_giao_vien: "ThinhTester", gia_vnd: 0, so_chuong: 1, so_bai_hoc: 1, so_hoc_vien: 0, ngay_tao: "2026-01-01" }], page: 1, pageSize: 12, totalCount: 1, chu_de: [] }),
  }));
  await page.route("**/api/cart/quote", async route => {
    const body = route.request().postDataJSON();
    const courseId = Number(body.courseIds?.[0] ?? 11);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ courseId, title: "Màu kỹ thuật số cho minh họa", priceVnd: 0, level: "CO_BAN", coverImage: null, available: true, enrolled: false, reason: null }],
        totalVnd: 0, paidCount: 0, freeCount: 1, blockedCount: 0,
      }),
    });
  });

  await page.goto(origin + "/courses", { waitUntil: "networkidle" });
  await page.locator(".cat-card").first().waitFor();
  const firstCard = page.locator(".cat-card").first();
  await firstCard.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await page.getByRole("link", { name: /Giỏ hàng, 1 khóa học/ }).waitFor();
  await page.getByRole("link", { name: /Giỏ hàng, 1 khóa học/ }).click();
  await page.getByRole("heading", { name: "Khóa học của bạn" }).waitFor();
  await page.getByText("Màu kỹ thuật số cho minh họa").waitFor();
  await page.getByRole("button", { name: "Đăng nhập để ghi danh" }).waitFor();
  await page.getByText("Cơ bản", { exact: true }).waitFor();

  await page.getByRole("button", { name: "Đăng nhập để ghi danh" }).click();
  await page.waitForURL(/\/login$/);
  assert.equal(new URL(page.url()).pathname, "/login");

  await page.goto(origin + "/cart", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Xóa tất cả" }).click();
  await page.getByRole("heading", { name: "Giỏ hàng đang trống" }).waitFor();

  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `cart ${width}px overflow`);
  }

  console.log("PASS guest cart add, count, quote, login handoff and empty state");
} finally {
  await browser?.close();
  server.kill();
}
