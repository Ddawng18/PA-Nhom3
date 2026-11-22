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
  env: {
    ...process.env,
    VITE_API_URL: origin,
    LOCAL_API_PROXY_TARGET: "https://linea-api-6pw5.onrender.com",
  },
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
  const courseItems = Array.from({ length: 8 }, (_, index) => {
    const id = 4 + index;
    return { ma_khoa_hoc: id, tieu_de: `Khóa học mẫu ${id}`, mo_ta: "Bảng màu và minh họa kỹ thuật số", cap_do: "CO_BAN", chu_de: "Màu sắc", anh_dai_dien: null, ma_giao_vien: "x", ten_giao_vien: "ThinhTester", gia_vnd: 0, so_chuong: 1, so_bai_hoc: 1, so_hoc_vien: 0, ngay_tao: "2026-01-01", ket_qua: [], phan_hoi_mau: null, kieu_bia: "auto" };
  });
  await page.route("**/api/catalog/courses?**", route => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ items: courseItems, page: 1, pageSize: 12, totalCount: 8, chu_de: [] }),
  }));
  await page.route(/\/api\/catalog\/courses\/(\d+)/, route => {
    const id = Number(route.request().url().match(/\/courses\/(\d+)/)?.[1] ?? 11);
    const course = courseItems.find(item => item.ma_khoa_hoc === id) ?? courseItems[0];
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        khoa_hoc: course,
        chuong: [{ ma_chuong: 1, tieu_de: "Chương mở đầu", thu_tu: 1, bai_hoc: [{ ma_bai_hoc: 101, tieu_de: "Bài học đầu tiên", thu_tu: 1, bat_buoc: true }] }],
        khoa_hoc_cung_chu_de: [],
      }),
    });
  });  await page.goto(origin + "/", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Bắt đầu từ một bài nhỏ" }).waitFor();
  assert.equal(await page.locator(".guest-course-grid .cat-card").count(), 3);
  assert.ok((await page.locator(".guest-proof-visual img").count()) === 1);
  assert.equal(await page.locator(".guest-loop-list li").count(), 3);
  assert.match(await page.getByRole("main").innerText(), /Ví dụ nhận xét bài vẽ/i);
  assert.match(await page.title(), /LINEA/);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `home ${width}px overflow`);
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(origin + "/courses", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Khóa học", exact: true }).waitFor();
  assert.equal(await page.locator(".cat-curated-card").count(), 3);
  assert.ok((await page.locator(".cat-card").count()) >= 7);
  assert.ok((await page.locator(".cat-card .course-cover").count()) >= 7);
  assert.ok((await page.locator(".cat-card-trial-badge").count()) >= 7);
  assert.ok((await page.locator(".cat-card .add-to-cart").count()) >= 7);
  assert.ok((await page.locator(".cat-card-demo-badge").count()) >= 7);
  assert.match(await page.locator(".cat-card").first().innerText(), /ThinhTester/);
  assert.match(await page.locator(".cat-card").first().innerText(), /Học thử/i);

  await page.locator(".cat-card-preview").first().click();
  await page.waitForURL(/\/courses\/\d+#sample-lesson$/);
  await page.locator("#sample-lesson").waitFor();
  assert.match(await page.locator("#sample-lesson").innerText(), /Bài tập nhỏ/);
  assert.match(await page.getByRole("main").innerText(), /Bạn sẽ luyện được gì/);
  assert.match(await page.getByRole("main").innerText(), /VÍ DỤ PHẢN HỒI/);
  assert.match(await page.getByRole("main").innerText(), /GIẢNG VIÊN/);
  assert.match(await page.getByRole("main").innerText(), /KHÓA HỌC MẪU|Khóa học mẫu/i);
  assert.match(await page.locator('meta[name="description"]').getAttribute("content") ?? "", /bảng màu|minh họa kỹ thuật số|LINEA/i);
  assert.match(await page.locator('meta[property="og:title"]').getAttribute("content") ?? "", /LINEA/);
  assert.match(await page.locator('meta[property="og:image"]').getAttribute("content") ?? "", /linea-studies-1200\.jpg$/);

  await page.setViewportSize({ width: 390, height: 1000 });
  assert.equal(await page.locator(".cd-mobile-cta").isVisible(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, "course detail 390px overflow");

  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto(origin + "/register", { waitUntil: "networkidle" });
  assert.equal(await page.locator(".auth-benefit-list li").count(), 3);
  await page.goto(origin + "/login", { waitUntil: "networkidle" });
  assert.equal(await page.locator(".auth-benefit-list li").count(), 3);

  await page.goto(origin + "/community", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Cùng nhau luyện vẽ" }).waitFor();
  assert.equal(await page.locator(".community-rules li").count(), 3);
  assert.ok((await page.locator(".community-post").count()) >= 5);

  console.log("PASS homepage proof, featured courses, designed covers, sample lesson, auth benefits, community rules and SEO");
} finally {
  await browser?.close();
  server.kill();
}
