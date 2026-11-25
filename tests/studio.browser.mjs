// Studio background, brush, undo/redo, autosave and mobile layout regression.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
  await page.addInitScript(() => {
    window.syncCanvasEncodes = 0;
    const encode = globalThis.HTMLCanvasElement.prototype.toDataURL;
    globalThis.HTMLCanvasElement.prototype.toDataURL = function (...args) {
      window.syncCanvasEncodes++;
      return encode.apply(this, args);
    };
  });
  await page.goto(`${origin}/studio`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const canvas = page.locator(".studio-canvas");
  await canvas.waitFor();
  const wrap = page.locator(".studio-canvas-wrap");
  assert.equal(await page.getByLabel("Nền canvas").inputValue(), "paper");
  const animatedBrush = page.getByRole("button", { name: "Nét chuyển động", exact: true });
  assert.equal(await animatedBrush.getAttribute("aria-pressed"), "true");
  assert.equal(await page.getByRole("button", { name: "Bút mềm" }).getAttribute("aria-pressed"), "true");
  await animatedBrush.click();

  await draw(canvas);
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll(".studio-toolbar button")].find(node => node.textContent?.trim() === "Hoàn tác");
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  assert.equal(await page.evaluate(() => window.syncCanvasEncodes), 0);
  await page.getByLabel("Nền canvas").selectOption("grid");
  assert.equal(await wrap.evaluate(node => node.classList.contains("is-grid")), true);
  await page.getByRole("button", { name: "Bút marker" }).click();
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
  await page.locator(".studio-canvas").waitFor();
  await page.waitForFunction(() => (document.querySelector('select[aria-label="Nền canvas"]')?.value ?? "") === "grid");
  assert.equal(await page.getByRole("button", { name: "Bút marker" }).getAttribute("aria-pressed"), "true");

  const gifButton = page.getByRole("button", { name: "Tải GIF", exact: true });
  await animatedBrush.click();
  await page.getByRole("button", { name: "Cọ hạt", exact: true }).click();
  await page.getByRole("button", { name: "Đỏ gạch" }).click();
  assert.equal(await page.getByLabel("Màu nét vẽ").inputValue(), "#c0403e");
  await page.getByLabel("Độ sần").selectOption("0.55");
  await page.getByLabel("Tốc độ chuyển động").selectOption("180");
  const preview = page.locator(".studio-motion-preview");
  const drawingBox = await canvas.boundingBox();
  await page.mouse.move(drawingBox.x + 90, drawingBox.y + 100);
  await page.mouse.down();
  await page.mouse.move(drawingBox.x + 210, drawingBox.y + 120, { steps: 4 });
  await preview.waitFor();
  await page.waitForFunction(() => Number(document.querySelector(".studio-motion-preview")?.dataset.frame) > 0);
  await page.mouse.up();
  await page.getByRole("button", { name: "Dừng xem thử", exact: true }).click();
  await preview.waitFor({ state: "detached" });

  await page.getByRole("button", { name: "Hoàn tác", exact: true }).click();
  await page.waitForFunction(() => {
    const draft = JSON.parse(localStorage.getItem("linea-studio-v1"));
    return !draft.frames;
  });
  assert.equal(await gifButton.isDisabled(), true);
  await page.getByRole("button", { name: "Làm lại", exact: true }).click();
  await page.waitForFunction(() => {
    const draft = JSON.parse(localStorage.getItem("linea-studio-v1"));
    return draft.frames?.length === 2 && new Set([draft.image, ...draft.frames]).size === 3;
  });

  await page.getByLabel("Nền canvas").selectOption("transparent");
  assert.equal(await page.evaluate(() => window.syncCanvasEncodes), 0);
  const gifDownloadPromise = page.waitForEvent("download");
  await gifButton.click();
  const gifDownload = await gifDownloadPromise;
  assert.equal(gifDownload.suggestedFilename(), "linea-studio.gif");
  const bytes = await readFile(await gifDownload.path());
  assert.equal(bytes.subarray(0, 6).toString("ascii"), "GIF89a");
  const gifInfo = await page.evaluate(async bytes => {
    const decoder = new globalThis.ImageDecoder({ data: new Uint8Array(bytes), type: "image/gif" });
    await decoder.tracks.ready;
    const frameCount = decoder.tracks.selectedTrack.frameCount;
    const { image } = await decoder.decode({ frameIndex: 0 });
    const output = new globalThis.OffscreenCanvas(image.displayWidth, image.displayHeight);
    const context = output.getContext("2d");
    context.drawImage(image, 0, 0);
    const alpha = context.getImageData(0, 0, 1, 1).data[3];
    const duration = image.duration;
    image.close();
    decoder.close();
    return { frameCount, alpha, duration };
  }, [...bytes]);
  assert.deepEqual(gifInfo, { frameCount: 3, alpha: 0, duration: 180000 });

  await page.reload();
  await preview.waitFor();
  assert.equal(await page.getByLabel("Độ sần").inputValue(), "0.55");
  assert.equal(await animatedBrush.getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "Dừng xem thử", exact: true }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  const heights = await page.locator(".studio-toolbar button").evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
  assert.ok(heights.every(height => height >= 44), JSON.stringify(heights));
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobile.goto(`${origin}/studio`);
  const mobileCanvas = mobile.locator(".studio-canvas");
  await mobileCanvas.scrollIntoViewIfNeeded();
  const box = await mobileCanvas.boundingBox();
  assert.ok(box);
  const cdp = await mobile.context().newCDPSession(mobile);
  const point = { x: box.x + 30, y: box.y + 30 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...point, x: point.x + 40 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  assert.equal(await mobile.getByRole("button", { name: "Hoàn tác", exact: true }).isEnabled(), true);
  const clearDrawing = async () => {
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Xóa tranh" }).click();
  };
  const stampInk = async name => {
    await clearDrawing();
    await page.getByRole("button", { name, exact: true }).click();
    await canvas.click({ position: { x: 70, y: 65 } });
    return canvas.evaluate(node => {
      const pixels = node.getContext("2d").getImageData(0, 0, node.width, node.height).data;
      let count = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) count++;
      return count;
    });
  };
  await page.getByLabel("Cỡ nét").fill("21");
  const stippleInk = await stampInk("Cọ hạt");
  const blobInk = await stampInk("Cọ mảng");
  assert.ok(stippleInk > 0 && blobInk > stippleInk * 3, JSON.stringify({ stippleInk, blobInk }));
  for (const brush of ["Phấn khô", "Cọ gạch", "Cọ tia"]) {
    assert.ok(await stampInk(brush) > 0, brush);
  }
  await clearDrawing();
  await page.getByRole("button", { name: "Cọ mảng", exact: true }).click();
  await page.getByLabel("Độ đậm nét vẽ").fill("0.5");
  await draw(canvas);
  const maxAlpha = await canvas.evaluate(node => {
    const pixels = node.getContext("2d").getImageData(0, 0, node.width, node.height).data;
    let max = 0;
    for (let i = 3; i < pixels.length; i += 4) max = Math.max(max, pixels[i]);
    return max;
  });
  assert.ok(maxAlpha >= 126 && maxAlpha <= 129, String(maxAlpha));
  assert.deepEqual(errors, []);
  console.log("PASS studio motion preview, animated GIF, history, autosave, PNG, fullscreen and touch at 390px");
} finally {
  await browser?.close();
  if (process.platform === "win32") await new Promise(resolve => {
    spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("close", resolve);
  }); else server.kill();
}
