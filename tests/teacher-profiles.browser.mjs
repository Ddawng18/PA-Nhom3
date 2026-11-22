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
  console.log("PASS demo teacher showcase, profile labels, disclaimer, not-found and responsive layout");
} finally {
  await browser?.close();
  server.kill();
}
