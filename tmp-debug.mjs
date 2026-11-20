import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
const port = await new Promise(resolve => { const s = createServer(); s.listen(0, "127.0.0.1", () => { const v = s.address().port; s.close(() => resolve(v)); }); });
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port)], { cwd: "C:/Users/Phat Thinh/Desktop/PA-Nhom3", windowsHide: true, stdio: "ignore", env: { ...process.env, VITE_API_URL: "http://localhost:4174" } });
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break; } catch { } await new Promise(r => setTimeout(r, 250)); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  const navs = []; page.on("framenavigated", f => { if (f === page.mainFrame()) navs.push(f.url()); });
  await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, r => r.fulfill({ contentType: "application/javascript", body: "export const supabase=null; export const isSupabaseConfigured=false; export const getGoogleProviderStatus=async()=>false;" }));
  await page.route("**/api/catalog/courses?*", r => r.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [], page: 1, pageSize: 12, totalCount: 0, chu_de: [] }) }));
  await page.goto(base + "/courses");
  await page.waitForTimeout(1200);
  console.log("after load:", page.url(), "mainInput:", JSON.stringify(await page.locator('main input[type="search"]').inputValue()));
  await page.locator('header.site-header input[type="search"]').fill("Gesture");
  await page.locator('header.site-header input[type="search"]').press("Enter");
  await page.waitForURL("**/courses?search=Gesture");
  for (const t of [0, 100, 300, 600, 1200]) {
    await page.waitForTimeout(t);
    console.log(`t+${t}:`, page.url(), "mainInput:", JSON.stringify(await page.locator('main input[type="search"]').inputValue()), "headerInput:", JSON.stringify(await page.locator('header.site-header input[type="search"]').inputValue()));
  }
  console.log("navs:", navs.slice(-5));
  console.log("errors:", errors);
  await browser.close();
} finally { server.kill(); }

