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
  env: { ...process.env, VITE_API_URL: origin, LOCAL_API_PROXY_TARGET: "https://linea-api-6pw5.onrender.com" },
});
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL });
  const timezoneId = process.env.PLAYWRIGHT_TIMEZONE ?? "America/Bogota";
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId });
  page.on("dialog", dialog => dialog.accept());
  await page.addInitScript(() => localStorage.setItem("linea-cookie-consent-v1", "accepted"));
  await page.route(/\/src\/auth\/useAuth\.ts(?:\?|$)/, route => route.fulfill({
    contentType: "application/javascript",
    body: "export function useAuth(){return {user:{id:'teacher-1',email:'teacher@example.test',user_metadata:{display_name:'Giáo viên mẫu'}},session:{access_token:'fixture'},loading:false,signOut:async()=>({error:null}),resetPassword:async()=>({error:null})}}",
  }));
  await page.route(/\/src\/hooks\/useUserRole\.ts(?:\?|$)/, route => route.fulfill({
    contentType: "application/javascript",
    body: "export function useUserRole(){return {role:'teacher',loading:false,error:null}}",
  }));
  await page.route(/\/src\/hooks\/useTeacherApproval\.ts(?:\?|$)/, route => route.fulfill({
    contentType: "application/javascript",
    body: "export function useTeacherApproval(){return {status:'DA_DUYET',loading:false,error:null,retry:()=>{}}}",
  }));
  await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/, route => route.fulfill({
    contentType: "application/javascript",
    body: "export const supabase={ from:()=>({select:async()=>({data:[],error:null})}), auth:{ getSession:async()=>({data:{session:null}}), onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}; export const isSupabaseConfigured=false; export const getGoogleProviderStatus=async()=>false;",
  }));

  await page.goto(origin + "/teacher/courses/new", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Tạo khóa học" }).waitFor();
  await page.getByRole("heading", { name: "Chọn mẫu khóa học" }).waitFor();
  await page.getByRole("button", { name: /Minh họa nhân vật/ }).click();
  assert.equal(await page.locator("#course-title").inputValue(), "Minh họa nhân vật");
  assert.match(await page.getByRole("button", { name: /Nội dung bài học/ }).innerText(), /2 chương/);
  assert.match(await page.locator(".teacher-publish-checklist").innerText(), /\/6 mục/);
  assert.match(await page.locator("#course-outcomes").inputValue(), /Dựng hình|silhouette/i);
  assert.match(await page.locator("#course-sample-feedback").inputValue(), /Bài luyện/);
  assert.equal(await page.locator("#course-cover-style").inputValue(), "auto");
  const artworkButton = page.getByRole("button", { name: "Chọn ảnh tác phẩm giảng viên" });
  assert.equal(await artworkButton.isDisabled(), false);
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), artworkButton.click()]);
  await chooser.setFiles({ name: "artwork.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") });
  await page.locator(".teacher-artwork-list img").waitFor();
  await page.getByRole("button", { name: "Xóa ảnh tác phẩm giảng viên 1" }).click();
  await page.getByRole("button", { name: "Xem trước" }).click();
  await page.locator(".teacher-preview-course").waitFor();
  assert.match(await page.locator(".teacher-preview-course").innerText(), /Minh họa nhân vật/);
  assert.match(await page.locator(".teacher-preview-course").innerText(), /Bạn sẽ luyện được gì/);
  assert.match(await page.locator(".teacher-preview-course").innerText(), /2 chương/);

  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `teacher authoring ${width}px overflow`);
  }

  await page.getByRole("button", { name: "Thông tin cơ bản", exact: true }).click();
  const teacherImages = page.getByLabel("Tác phẩm giảng viên", { exact: true });
  const studentImages = page.getByLabel("Tác phẩm học viên", { exact: true });
  const gallery = page.locator(".teacher-artwork-editor");
  const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=", "base64");
  const image = index => ({ name: `tac-pham-${index}.png`, mimeType: "image/png", buffer: pixel });
  await teacherImages.setInputFiles(Array.from({ length: 6 }, (_, i) => image(i)));
  await gallery.getByRole("alert").filter({ hasText: "tối đa 5 ảnh" }).waitFor();
  await teacherImages.setInputFiles(Array.from({ length: 5 }, (_, i) => image(i)));
  await gallery.getByText(/^5\/5 ảnh/).waitFor();
  assert.ok(await teacherImages.isDisabled());
  await studentImages.setInputFiles(image(6));
  await gallery.getByText(/^1\/5 ảnh/).waitFor();
  await gallery.getByRole("button", { name: "Xóa ảnh tác phẩm giảng viên 5" }).click();
  await gallery.getByText(/^4\/5 ảnh/).waitFor();

  let galleryWrites = 0;
  const artworkHost = "https://example.supabase.co/storage/v1/object/public/course-media/";
  await page.route("**/api/courses/99/media/media", route => {
    assert.equal(route.request().method(), "POST");
    const path = `99/${String(++galleryWrites).padStart(32, "0")}.png`;
    return route.fulfill({ json: { path, publicUrl: artworkHost + path } });
  });
  await page.route(artworkHost + "**", route => route.fulfill({ contentType: "image/png", body: pixel }));
  let savedArtwork;
  let savedDraft;
  let draftInfo;
  await page.route("**/api/courses", route => {
    draftInfo = { ...route.request().postDataJSON(), ma_khoa_hoc: 99, ma_giao_vien: "teacher-1",
      trang_thai: "NHAP", ngay_tao: "2026-11-22T00:00:00Z" };
    return route.fulfill({ status: 201, json: draftInfo });
  });
  await page.route("**/api/courses/99/editor/version", route => route.fulfill({ json: {version: "new"} }));
  await page.route("**/api/courses/99", route => route.fulfill({ json: draftInfo }));
  await page.route("**/api/courses/99/editor", route => {
    if (route.request().method() === "GET") return route.fulfill({ json: savedDraft });
    const request = route.request().postDataJSON();
    savedArtwork = request.artwork;
    const chapterIds = request.chapters.map((_, index) => 100 + index);
    const lessonIds = request.lessons.map((_, index) => 200 + index);
    savedDraft = {
      version: "draft-v1",
      anh_giang_vien: savedArtwork.teacher,
      anh_hoc_vien: savedArtwork.student,
      chapters: request.chapters.map((chapter, index) => ({
        ma_chuong: chapterIds[index], ma_khoa_hoc: 99, tieu_de: chapter.title, thu_tu: chapter.order,
      })),
      lessons: request.lessons.map((lesson, index) => ({
        ma_bai_hoc: lessonIds[index], ma_chuong: chapterIds[request.chapters.findIndex(chapter => chapter.id === lesson.chapterId)],
        tieu_de: lesson.title, thu_tu: lesson.order, noi_dung_van_ban: lesson.textContent,
        duong_dan_anh: lesson.imagePath, lien_ket_video: lesson.videoUrl, bat_buoc: lesson.required,
      })),
      assignments: [], attachments: [], rubrics: [],
    };
    return route.fulfill({ json: {
      courseId: 99, chapters: chapterIds.length, lessons: lessonIds.length,
      chapterIds, lessonIds, assignmentIds: [], artworkSaved: true, version: savedDraft.version,
    } });
  });
  await page.getByRole("button", { name: /Nội dung bài học/ }).click();
  const activeLesson = page.locator("#lesson-title");
  const activeTitle = await activeLesson.inputValue();
  await activeLesson.evaluate(input => input.dataset.editorRetained = "true");
  await page.getByRole("button", { name: "Lưu toàn bộ", exact: true }).last().click();
  await page.waitForURL("**/teacher/courses/99/edit");
  await page.locator(".teacher-save-toast").filter({ hasText: "Đã lưu khóa học" }).waitFor();
  assert.equal(await activeLesson.inputValue(), activeTitle);
  assert.equal(await activeLesson.getAttribute("data-editor-retained"), "true");
  await page.waitForFunction(() => document.querySelector("#lesson-title")?.disabled === false);
  assert.equal(galleryWrites, 5);
  assert.equal(savedArtwork.teacher.length, 4);
  assert.equal(savedArtwork.student.length, 1);
  await page.getByRole("button", { name: "Thông tin cơ bản", exact: true }).click();
  await gallery.getByText(/^4\/5 ảnh/).waitFor();
  assert.equal(await gallery.getByRole("img").count(), 5);


  let savedDeadline = await page.evaluate(() => new Date("2099-04-06T04:00").toISOString());
  const lessonTitle = "Bố cục và dựng hình";
  const course = {
    ma_khoa_hoc: 42, ma_giao_vien: "teacher-1", tieu_de: "Minh họa nhân vật",
    cap_do: "CO_BAN", chu_de: "Minh họa", mo_ta: "Khóa học minh họa nhân vật với nội dung thực hành dựng hình và phối màu.",
    anh_dai_dien: null, trang_thai: "NHAP", ngay_tao: "2026-11-22T00:00:00Z",
  };
  await page.route("**/api/courses/42", route => route.fulfill({ json: course }));
  await page.route("**/api/courses/42/editor", route => {
    if (route.request().method() === "PUT") {
      savedDeadline = route.request().postDataJSON().assignments[0].deadline;
      return route.fulfill({ json: {
        courseId: 42, chapters: 1, lessons: 1, chapterIds: [43], lessonIds: [44], assignmentIds: [45], version: "v2",
      } });
    }
    return route.fulfill({ json: {
      version: "v1",
      chapters: [{ ma_chuong: 43, ma_khoa_hoc: 42, tieu_de: "Cơ sở minh họa", thu_tu: 1 }],
      lessons: [{ ma_bai_hoc: 44, ma_chuong: 43, tieu_de: lessonTitle, thu_tu: 1, noi_dung_van_ban: "Thực hành dựng hình.", duong_dan_anh: null, lien_ket_video: null, bat_buoc: true }],
      assignments: [{ ma_bai_tap: 45, ma_bai_hoc: 44, de_bai: "Vẽ phác thảo nhân vật.", han_nop: savedDeadline, bat_buoc: true }],
      attachments: [],
      rubrics: [{ ma_tieu_chi: 46, ma_bai_tap: 45, ten_tieu_chi: "Bố cục", ty_trong: 100, thu_tu: 1 }],
    } });
  });
  async function openDeadline() {
    await page.getByRole("button", { name: /Nội dung bài học/ }).click();
    const input = page.getByLabel("Hạn nộp", { exact: true });
    await input.waitFor();
    return input;
  }
  await page.goto(origin + "/teacher/courses/42/edit");
  let deadline = await openDeadline();
  assert.equal(await deadline.inputValue(), "2099-04-06T04:00");
  const nextDeadline = "2099-04-07T04:00";
  const expectedUtc = await page.evaluate(value => new Date(value).toISOString(), nextDeadline);
  await deadline.fill(nextDeadline);
  assert.equal(await deadline.inputValue(), nextDeadline);
  const save = page.waitForResponse(response => response.url().endsWith("/api/courses/42/editor") && response.request().method() === "PUT");
  await page.getByRole("button", { name: "Lưu toàn bộ", exact: true }).last().click();
  assert.equal((await save).status(), 200);
  assert.equal(savedDeadline, expectedUtc);
  await page.locator(".teacher-save-toast").filter({ hasText: "Đã lưu khóa học" }).waitFor();
  assert.equal(await deadline.inputValue(), nextDeadline);
  await page.waitForFunction(() => document.querySelector("#assignment-deadline")?.disabled === false);
  await page.reload();
  deadline = await openDeadline();
  assert.equal(await deadline.inputValue(), nextDeadline);

  const publicCourse = {
    ...draftInfo, trang_thai: "DA_DANG", ten_giao_vien: "Giáo viên mẫu",
    so_chuong: 2, so_bai_hoc: 3, so_hoc_vien: 0, gia_vnd: 0,
  };
  await page.route("**/api/catalog/courses/99", route => route.fulfill({ json: {
    khoa_hoc: publicCourse, chuong: [],
    khoa_hoc_cung_chu_de: [{ ...publicCourse, ma_khoa_hoc: 98, tieu_de: "Chủ đề tương tự" }],
    anh_giang_vien: savedArtwork.teacher, anh_hoc_vien: savedArtwork.student,
  } }));
  await page.route("**/api/courses/99/learn**", route => route.fulfill({ status: 404, json: {} }));
  await page.goto(origin + "/courses/99");
  const showcase = page.getByRole("region", { name: "Tác phẩm của giảng viên và học viên" });
  await showcase.waitFor();
  assert.equal(await showcase.getByRole("img", { name: /Tác phẩm giảng viên/ }).count(), 4);
  assert.equal(await showcase.getByRole("img", { name: /Tác phẩm học viên/ }).count(), 1);
  assert.ok(await showcase.evaluate(element =>
    element.previousElementSibling?.classList.contains("cd-content") &&
    element.nextElementSibling?.classList.contains("cd-related")
  ));
  console.log("PASS artwork limits, upload, draft refresh and placement on the published course");
  console.log("PASS teacher deadline selects, saves UTC, and reopens at the same local time in " + timezoneId);
  console.log("PASS teacher template picker, checklist and live public-page preview");
} finally {
  await browser?.close();
  server.kill();
}
