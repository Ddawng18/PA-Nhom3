// Browser regression for header navigation/search and mobile catalog layout. API is an explicit fixture.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const port = await new Promise(resolve => {
  const socket = createServer(); socket.listen(0, "127.0.0.1", () => {
    const value = socket.address().port; socket.close(() => resolve(value));
  });
});
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: fileURLToPath(new URL("../", import.meta.url)), windowsHide: true, stdio: "ignore",
  env: { ...process.env, VITE_API_URL: "http://localhost:4174" },
});
let browser;
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break; } catch { /* starting */ } await new Promise(r => setTimeout(r, 250)); }
  browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, r => r.fulfill({ contentType: "application/javascript", body: "export const supabase=null; export const isSupabaseConfigured=false; export const getGoogleProviderStatus=async()=>false;" }));
  await page.route("**/api/catalog/courses?*", r => r.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [], page: 1, pageSize: 12, totalCount: 0, chu_de: [] }) }));
  await page.goto(base + "/courses");
  await page.locator('header input[type="search"]').fill("Gesture");
  await page.locator('header input[type="search"]').press("Enter");
  await page.waitForURL("**/courses?search=Gesture");
  assert.equal(await page.locator('main input[type="search"]').inputValue(), "Gesture");
  assert.equal(await page.getByRole("button", { name: "Yêu thích", exact: true }).count(), 0);
  await page.setViewportSize({ width: 360, height: 800 });
  const searchBox = await page.locator(".cat-search").boundingBox();
  assert.ok(searchBox.height >= 36 && searchBox.height <= 48, JSON.stringify(searchBox));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  const nav = page.getByRole("navigation", { name: "Điều hướng chính" });
  assert.equal(await nav.getByRole("link", { name: "Studio", exact: true }).isVisible(), true);
  await nav.getByRole("link", { name: "Studio", exact: true }).click();
  await page.waitForURL("**/studio"); await page.locator("canvas").waitFor();
  assert.equal(await page.getByRole("button", { name: "Mở menu", exact: true }).getAttribute("aria-expanded"), "false");
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await nav.getByRole("link", { name: "Cộng đồng", exact: true }).click();
  await page.waitForURL("**/community");
  assert.deepEqual(errors, []);
  console.log("PASS header search, removed inactive favorite, 38px mobile search, mobile menu and navigation");
} finally { await browser?.close(); server.kill(); }
