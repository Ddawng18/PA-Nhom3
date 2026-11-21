// Community like/report regression with fixture API and fixture auth.
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
async function authRoute(page, authenticated) {
  await page.route(/\/src\/auth\/useAuth\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: authenticated
      ? "export function useAuth(){return {user:{id:'fixture-user',email:'user@example.test',user_metadata:{}},session:{access_token:'fixture'},loading:false}}"
      : "export function useAuth(){return {user:null,session:null,loading:false}}" }));
  await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript",
    body: "export const supabase=null; export const isSupabaseConfigured=false; export const getGoogleProviderStatus=async()=>false;" }));
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
  await authRoute(page, true);
  let liked = false, likeCount = 1, reportBody = null;
  const post = () => ({
    id: 7, authorId: "other-user", title: "Tranh luyện tập", body: "Chia sẻ tiến độ", author: "Minh Anh",
    createdAt: new Date().toISOString(), imageUrl: null, commentCount: 0, likeCount, liked,
  });
  await page.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === "/api/community/posts/7/like") {
      liked = request.method() === "POST";
      likeCount = liked ? 2 : 1;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ liked, likeCount }) });
    }
    if (path === "/api/community/posts/7/report") {
      reportBody = JSON.parse(request.postData() || "{}");
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ reported: true }) });
    }
    if (path === "/api/community/posts/7/comments") {
      return route.fulfill({ contentType: "application/json", body: "[]" });
    }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify([post()]) });
  });
  await page.goto(`${origin}/community`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const like = page.getByRole("button", { name: /^Thích \(1\)$/ });
  await like.waitFor();
  assert.equal(await like.getAttribute("aria-pressed"), "false");
  await like.click();
  const likedButton = page.getByRole("button", { name: /^Đã thích \(2\)$/ });
  await likedButton.waitFor();
  assert.equal(await likedButton.getAttribute("aria-pressed"), "true");
  await likedButton.click();
  await page.getByRole("button", { name: /^Thích \(1\)$/ }).waitFor();
  await page.getByRole("button", { name: "Báo cáo bài viết", exact: true }).click();
  await page.getByLabel("Lý do báo cáo").fill("Nội dung có dấu hiệu đạo nhái tác phẩm.");
  await page.getByRole("button", { name: "Gửi báo cáo", exact: true }).click();
  await page.getByText("Đã gửi báo cáo tới quản trị viên.").waitFor();
  assert.deepEqual(reportBody, { reason: "Nội dung có dấu hiệu đạo nhái tác phẩm." });

  const anon = await browser.newPage();
  await authRoute(anon, false);
  await anon.route("**/api/**", route => route.fulfill({ contentType: "application/json", body: JSON.stringify([post()]) }));
  await anon.goto(`${origin}/community`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const anonLike = anon.getByRole("button", { name: /^Thích \(1\)$/ });
  await anonLike.waitFor();
  assert.equal(await anonLike.isDisabled(), true);
  assert.equal(await anon.getByRole("button", { name: "Báo cáo bài viết", exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log("PASS community like toggle, optimistic revert path, report form and anonymous guard");
} finally {
  await browser?.close();
  if (process.platform === "win32") await new Promise(resolve => {
    spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("close", resolve);
  }); else server.kill();
}
