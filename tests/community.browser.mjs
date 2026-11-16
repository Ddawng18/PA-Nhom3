// Isolated community flow: API responses are fixtures, no production writes.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const port = await new Promise(resolve => {
  const socket = createServer(); socket.listen(0, "127.0.0.1", () => {
    const port = socket.address().port; socket.close(() => resolve(port));
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
  const page = await browser.newPage(); page.setDefaultTimeout(10000);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.route(/\/src\/auth\/useAuth\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: "export function useAuth(){return {user:{id:'fixture-user',email:'user@example.test',user_metadata:{}},session:{access_token:'fixture'},loading:false}}" }));
  await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: "export const supabase=null; export const isSupabaseConfigured=false; export const getGoogleProviderStatus=async()=>false;" }));
  let posts = [], comments = [], failPost = true, failComment = true;
  await page.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    let data = {};
    if (request.method() === "POST" && path.endsWith("/with-image")) {
      assert.match(request.headers()["content-type"], /multipart\/form-data/);
      assert.match(request.postData(), /filename="art.png"/);
      if (failPost) return route.fulfill({ status: 503, contentType: "application/json", body: '{"detail":"Upload temporarily unavailable"}' });
      data = { id: 1, title: "Test community post", body: "My artwork", author: "Member", createdAt: new Date().toISOString(), imageUrl: "https://example.test/art.png", commentCount: 0 };
      posts = [data];
    } else if (path.endsWith("/comments")) {
      if (request.method() === "POST") {
        if (failComment) return route.fulfill({ status: 503, contentType: "application/json", body: '{}' });
        data = { id: 1, body: request.postDataJSON().body, author: "Member", createdAt: new Date().toISOString() }; comments = [data];
      } else data = comments;
    } else if (path === "/api/community/posts") data = posts;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
  });
  await page.route("https://example.test/art.png", route => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") }));
  await page.goto(`${origin}/community`);
  await page.locator("#post-title").fill("Test community post");
  await page.locator("#post-body").fill("My artwork");
  await page.locator("#post-image").setInputFiles({ name: "art.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") });
  await page.getByAltText("Ảnh xem trước bài viết").waitFor();
  await page.getByRole("button", { name: "Đăng bài", exact: true }).click();
  await page.getByText(/Upload temporarily unavailable/).waitFor();
  assert.equal(await page.locator("#post-body").inputValue(), "My artwork");
  assert.equal(await page.getByAltText("Ảnh xem trước bài viết").count(), 1);
  failPost = false;
  await page.getByRole("button", { name: "Đăng bài", exact: true }).click();
  await page.getByAltText("Ảnh đính kèm: Test community post").waitFor();
  await page.getByRole("button", { name: "Bình luận (0)", exact: true }).click();
  await page.locator("#comment-1").fill("Great artwork!");
  await page.getByRole("button", { name: "Gửi bình luận", exact: true }).click();
  await page.getByText(/Chưa gửi được bình luận/).waitFor();
  assert.equal(await page.locator("#comment-1").inputValue(), "Great artwork!");
  failComment = false;
  await page.getByRole("button", { name: "Gửi bình luận", exact: true }).click();
  await page.getByText("Great artwork!", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Bình luận (1)", exact: true }).waitFor();
  assert.equal(await page.locator("#comment-1").inputValue(), "");
  assert.deepEqual(errors, []);
  console.log("PASS image preview, multipart publish, comments, and preserved drafts on failures");
} finally {
  await browser?.close();
  if (process.platform === "win32") await new Promise(resolve => {
    spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("close", resolve);
  }); else server.kill();
}
