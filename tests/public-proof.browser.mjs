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

  await page.goto(origin + "/", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Bắt đầu từ một bài nhỏ" }).waitFor();
  assert.equal(await page.locator(".guest-course-grid .cat-card").count(), 3);
  assert.ok((await page.locator(".guest-proof-visual img").count()) === 1);
  assert.equal(await page.locator(".guest-loop-list li").count(), 3);
  assert.match(await page.getByRole("main").innerText(), /không phải đánh giá bài nộp thật/i);
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
  await page.goto(origin + "/pricing", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Bắt đầu miễn phí. Chỉ trả tiền khi bạn cần thêm." }).waitFor();
  assert.equal(await page.locator(".pricing-card").count(), 3);
  assert.equal(await page.locator(".pricing-faq-item").count(), 5);
  assert.match(await page.title(), /Học phí & FAQ/);
  await page.locator(".pricing-faq-item").first().click();
  assert.equal(await page.locator(".pricing-faq-item").first().getAttribute("open"), "");

  await page.goto(origin + "/register", { waitUntil: "networkidle" });
  assert.equal(await page.locator(".auth-benefit-list li").count(), 3);
  await page.goto(origin + "/login", { waitUntil: "networkidle" });
  assert.equal(await page.locator(".auth-benefit-list li").count(), 3);

  await page.goto(origin + "/community", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Cùng nhau luyện vẽ" }).waitFor();
  assert.equal(await page.locator(".community-rules li").count(), 3);
  assert.ok((await page.locator(".community-post").count()) >= 5);

  console.log("PASS homepage proof, featured courses, designed covers, sample lesson, pricing/FAQ, auth benefits, community rules and SEO");
} finally {
  await browser?.close();
  server.kill();
}
