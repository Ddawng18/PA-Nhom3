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
  browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL });

  const guest = await browser.newPage();
  await guest.goto(origin + "/");
  await guest.getByText("Ví dụ nhận xét bài vẽ").waitFor();
  assert.equal(await guest.locator('a[href^="/teachers/"]').count(), 0);
  await guest.goto(origin + "/teachers/nmratist");
  await guest.waitForURL(origin + "/courses");
  await guest.goto(origin + "/teacher/onboarding");
  await guest.waitForURL(origin + "/login");
  await guest.close();

  for (const [role, home] of [["student", null], ["admin", "/admin"], ["teacher", "/teacher"]]) {
    const page = await browser.newPage();
    await page.route(/\/src\/auth\/useAuth\.ts(?:\?|$)/, route => route.fulfill({
      contentType: "application/javascript",
      body: "export function useAuth(){return {user:{id:'fixture-user',email:'user@example.test',user_metadata:{}},session:{access_token:'fixture'},loading:false}}",
    }));
    await page.route(/\/src\/hooks\/useUserRole\.ts(?:\?|$)/, route => route.fulfill({
      contentType: "application/javascript",
      body: `export function useUserRole(){return {role:${JSON.stringify(role)},loading:false,error:null}}`,
    }));
    await page.route("**/api/**", route => route.fulfill({ status: 404, json: { code: "NOT_FOUND" } }));
    await page.route("**/api/teacher/profile/me", route => role === "teacher"
      ? route.fulfill({ json: {
          id: 1, userId: "fixture-user", introduction: "", experience: "", status: "DA_DUYET",
          rejectionReason: null, supplementReason: null, fields: [], portfolioFiles: [], history: [],
        } })
      : route.fulfill({ status: 404, json: { code: "NOT_FOUND" } }));

    await page.goto(origin + "/teacher/onboarding");
    const application = page.getByRole("heading", { name: "Bạn muốn làm giáo viên?" });
    if (home) {
      await page.waitForURL(origin + home);
      assert.equal(await application.count(), 0);
      assert.equal(await page.locator('a[href="/teacher/onboarding"]').count(), 0);
    } else {
      await application.waitFor();
      await page.getByLabel("Giới thiệu bản thân").waitFor();
      assert.equal(await page.getByRole("button", { name: "Gửi hồ sơ xét duyệt" }).isEnabled(), true);
      assert.equal(await page.getByRole("link", { name: "Bạn muốn làm giáo viên?" }).count(), 1);
      assert.equal(await page.getByText("Khóa học mẫu", { exact: true }).count(), 0);
      assert.equal(await page.getByLabel("Tiêu đề chuyên môn").count(), 0);
      assert.equal(await page.getByLabel("Khu vực", { exact: true }).count(), 0);
      const tagInput = page.getByRole("textbox", { name: "Thẻ CV" });
      await tagInput.fill("Minh họa nhân vật");
      await tagInput.press("Enter");
      await tagInput.fill("Màu nước");
      await page.getByRole("button", { name: "Thêm thẻ", exact: true }).click();
      await page.getByRole("button", { name: "Xóa thẻ Màu nước" }).click();
      await page.getByLabel("Ngôn ngữ giảng dạy").fill("Tiếng Việt");
      await page.getByLabel("Phương pháp giảng dạy", { exact: true }).fill("Thực hành theo từng bước.");
      await page.getByLabel("Giới thiệu bản thân").fill("Tôi giảng dạy minh họa và giúp học viên hoàn thành bản vẽ theo từng bước.");
      await page.getByLabel("Kinh nghiệm giảng dạy và sáng tác").fill("Tôi đã dạy minh họa trong hai năm.");
      const pdf = Buffer.from("%PDF-1.4\n%%EOF");
      const cvInput = page.getByLabel("CV", { exact: true });
      await cvInput.setInputFiles({ name: "wrong.pdf", mimeType: "application/pdf", buffer: pdf });
      await page.getByRole("button", { name: "Xóa CV đã chọn" }).click();
      assert.equal(await cvInput.inputValue(), "");
      await cvInput.setInputFiles({ name: "cv.pdf", mimeType: "application/pdf", buffer: pdf });
      await page.getByLabel("Ảnh tác phẩm").setInputFiles([
        { name: "art.png", mimeType: "image/png", buffer: Buffer.from([1]) },
        { name: "wrong.png", mimeType: "image/png", buffer: Buffer.from([2]) },
      ]);
      await page.getByRole("button", { name: "Xóa ảnh wrong.png" }).click();
      assert.equal(await page.getByText("wrong.png", { exact: false }).count(), 0);
      await page.route("**/api/teacher/profile/me/portfolio", route => {
        assert.match(route.request().postData(), /art\.png/);
        assert.doesNotMatch(route.request().postData(), /wrong\.png/);
        return route.fulfill({ status: 201, json: { filePath: "art.png", fileName: "art.png", size: 1 } });
      });
      await page.route("**/api/teacher/profile/me/submit", route => route.fulfill({ status: 202, json: {} }));
      const submitted = page.waitForRequest(request => request.url().endsWith("/api/teacher/profile/me/submit"));
      await page.getByRole("button", { name: "Gửi hồ sơ xét duyệt" }).click();
      const submission = (await submitted).postDataJSON();
      assert.deepEqual(submission.details.cvTags, ["Minh họa nhân vật"]);
      assert.ok(!("location" in submission.details));
      assert.equal(submission.details.languages, "Tiếng Việt");
      assert.equal(submission.details.teachingApproach, "Thực hành theo từng bước.");
      assert.equal(submission.cvPdf, pdf.toString("base64"));

      let status;
      let hasCv = true;
      let portfolioFiles = [{
        id: 17, filePath: "saved.png", downloadUrl: "/download", signedUrlEndpoint: "/signed",
        uploadedAt: "2026-11-22T12:00:00+07:00",
      }];
      await page.route("**/api/teacher/profile/me/cv", route => {
        assert.equal(route.request().method(), "DELETE");
        hasCv = false;
        return route.fulfill({ status: 204 });
      });
      await page.route("**/api/teacher/profile/me/portfolio/17", route => {
        assert.equal(route.request().method(), "DELETE");
        portfolioFiles = [];
        return route.fulfill({ status: 204 });
      });
      await page.route("**/api/teacher/profile/me", route => route.fulfill({ json: {
        id: 1, userId: "fixture-user", introduction: "Nội dung hồ sơ đã gửi.", experience: "Kinh nghiệm đã lưu.",
        status, rejectionReason: null, supplementReason: null, fields: [], portfolioFiles, hasCv, history: [],
      } }));
      await page.route("**/api/teacher/profile/me/withdraw", route => {
        assert.equal(route.request().method(), "POST");
        status = "DA_RUT";
        return route.fulfill({ status: 204 });
      });
      for (const initialStatus of ["CHO_DUYET", "TU_CHOI"]) {
        status = initialStatus;
        await page.reload();
        const introduction = page.getByLabel("Giới thiệu bản thân");
        const withdraw = page.getByRole("button", { name: "Rút hồ sơ để chỉnh sửa" });
        await withdraw.waitFor();
        assert.ok(await introduction.isDisabled());
        assert.equal(await page.getByRole("button", { name: "Xóa CV đã nộp" }).count(), 0);
        await withdraw.click();
        await page.getByRole("heading", { name: "Đã rút hồ sơ" }).waitFor();
        await introduction.fill("Nội dung chỉnh sửa sau khi rút hồ sơ.");
        assert.ok(await page.getByRole("button", { name: "Gửi lại hồ sơ" }).isEnabled());
        if (initialStatus === "CHO_DUYET") {
          await page.getByRole("button", { name: "Xóa CV đã nộp" }).click();
          await page.getByText("Đã xóa CV khỏi hồ sơ.").waitFor();
          await page.getByRole("button", { name: "Xóa ảnh tác phẩm #17" }).click();
          await page.getByText("Đã xóa ảnh khỏi hồ sơ.").waitFor();
          assert.equal(await introduction.inputValue(), "Nội dung chỉnh sửa sau khi rút hồ sơ.");
          await page.reload();
          await page.getByRole("heading", { name: "CV và tác phẩm" }).waitFor();
          assert.equal(await page.getByRole("button", { name: "Tải CV đã nộp" }).count(), 0);
          assert.equal(await page.getByRole("button", { name: "Xem ảnh tác phẩm #17" }).count(), 0);
        }
      }
    }
    await page.close();
  }
  console.log("PASS teacher application route and navigation by role, and removal of sample profiles");
} finally {
  await browser?.close();
  server.kill();
}
