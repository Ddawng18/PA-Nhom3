// Studio background, brush, undo/redo, autosave and mobile layout regression.
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
let browser;
async function draw(canvas) {
  const box = await canvas.boundingBox();
  assert.ok(box);
  await canvas.page().mouse.move(box.x + 80, box.y + 80);
  await canvas.page().mouse.down();
  await canvas.page().mouse.move(box.x + 260, box.y + 180, { steps: 8 });
  await canvas.page().mouse.up();
}
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(30000);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: "export const supabase=null; export const isSupabaseConfigured=false; export const getGoogleProviderStatus=async()=>false;" }));
  await page.goto(`${origin}/studio`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const canvas = page.locator("canvas");
  await canvas.waitFor();
  const wrap = page.locator(".studio-canvas-wrap");
  assert.equal(await page.getByLabel("Nền canvas").inputValue(), "paper");
  assert.equal(await page.getByLabel("Kiểu bút").inputValue(), "soft");

  await draw(canvas);
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll(".studio-toolbar button")].find(node => node.textContent?.trim() === "Hoàn tác");
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  await page.getByLabel("Nền canvas").selectOption("grid");
  assert.equal(await wrap.evaluate(node => node.classList.contains("is-grid")), true);
  await page.getByLabel("Kiểu bút").selectOption("marker");
  await draw(canvas);
  await page.getByRole("button", { name: "Hoàn tác", exact: true }).click();
  await page.getByRole("button", { name: "Làm lại", exact: true }).click();
  await page.waitForFunction(() => {
    const raw = localStorage.getItem("linea-studio-v1");
    if (!raw) return false;
    try { const draft = JSON.parse(raw); return draft.background === "grid" && draft.brush === "marker" && draft.image.startsWith("data:image/png"); }
    catch { return false; }
  });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải PNG", exact: true }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), "linea-studio.png");

  await page.reload();
  await page.locator("canvas").waitFor();
  await page.waitForFunction(() => (document.querySelector('select[aria-label="Nền canvas"]')?.value ?? "") === "grid");
  assert.equal(await page.getByLabel("Kiểu bút").inputValue(), "marker");

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  const heights = await page.locator(".studio-toolbar button").evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
  assert.ok(heights.every(height => height >= 44), JSON.stringify(heights));
  assert.deepEqual(errors, []);
  console.log("PASS studio background, brush preset, undo/redo, autosave reload, export and 390px layout");
} finally {
  await browser?.close();
  if (process.platform === "win32") await new Promise(resolve => {
    spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("close", resolve);
  }); else server.kill();
}
