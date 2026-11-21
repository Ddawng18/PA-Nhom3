// Lightweight WCAG smoke audit for public pages: names, labels, alt text, duplicate ids,
// landmarks and mobile overflow. Fails on critical markup issues, logs size warnings.
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
const auditPages = ["/", "/courses", "/studio", "/community", "/login", "/register"];
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(30000);
  await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: "export const supabase=null; export const isSupabaseConfigured=false; export const getGoogleProviderStatus=async()=>false;" }));
  await page.route("**/api/catalog/courses**", route => route.fulfill({ contentType: "application/json",
    body: JSON.stringify({ items: [], page: 1, pageSize: 12, totalCount: 0, chu_de: [] }) }));
  await page.route("**/api/community/posts**", route => route.fulfill({ contentType: "application/json", body: "[]" }));
  const warnings = [];
  for (const path of auditPages) {
    await page.goto(origin + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(600);
    const result = await page.evaluate(() => {
      const nameOf = element => (element.getAttribute("aria-label") || element.textContent || element.getAttribute("title") || "").trim();
      const missingNames = [...document.querySelectorAll("button, a, [role=button]")]
        .filter(element => element.offsetParent !== null && !nameOf(element))
        .map(element => element.outerHTML.slice(0, 120));
      const missingAlt = [...document.querySelectorAll("img")].filter(image => !image.hasAttribute("alt")).map(image => image.src);
      const missingLabels = [...document.querySelectorAll("input:not([type=hidden]), select, textarea")]
        .filter(element => !(element.getAttribute("aria-label") || element.getAttribute("aria-labelledby") ||
          element.closest("label") || (element.id && document.querySelector(`label[for="${CSS.escape(element.id)}"]`))))
        .map(element => element.outerHTML.slice(0, 120));
      const counts = {}; const duplicateIds = [];
      for (const element of document.querySelectorAll("[id]")) {
        counts[element.id] = (counts[element.id] || 0) + 1;
        if (counts[element.id] === 2) duplicateIds.push(element.id);
      }
      const smallTargets = [...document.querySelectorAll("button")]
        .filter(element => element.offsetParent !== null && element.getBoundingClientRect().height < 40)
        .map(element => `${nameOf(element) || "?"} (${Math.round(element.getBoundingClientRect().height)}px)`);
      return {
        missingNames, missingAlt, missingLabels, duplicateIds, smallTargets,
        hasMain: Boolean(document.querySelector("main")),
        overflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    assert.deepEqual(result.missingNames, [], `${path} has buttons/links without accessible names`);
    assert.deepEqual(result.missingAlt, [], `${path} has images without alt`);
    assert.deepEqual(result.missingLabels, [], `${path} has form controls without labels`);
    assert.deepEqual(result.duplicateIds, [], `${path} has duplicate ids`);
    assert.equal(result.hasMain, true, `${path} has no main landmark`);
    assert.equal(result.overflow, false, `${path} overflows horizontally at 390px`);
    if (result.smallTargets.length) warnings.push(`${path}: ${result.smallTargets.join(", ")}`);
  }
  console.log("PASS a11y smoke audit:", auditPages.join(", "));
  if (warnings.length) console.log("WARN touch targets under 40px:\n" + warnings.join("\n"));
} finally {
  await browser?.close();
  if (process.platform === "win32") await new Promise(resolve => {
    spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("close", resolve);
  }); else server.kill();
}
