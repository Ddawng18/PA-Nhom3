import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { courseLevels, courseStatuses, sampleTeacherCourse } from "../data/teacherCourseOptions";
import {
  moveAndResequence,
  resequence,
  teacherCourseFormSchema,
  type TeacherCourseFormValues,
} from "../logic/teacherCourse";
import "../styles/teacher-course.css";

function getDisplayName(user: User): string {
  const metadataName = user.user_metadata.display_name;
  if (typeof metadataName === "string" && metadataName.trim()) return metadataName.trim();
  return user.email?.split("@")[0] || "Học viên LINEA";
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

function createEmptyCourse(): TeacherCourseFormValues {
  return {
    tieu_de: "",
    cap_do: "Cơ bản",
    chu_de: "",
    mo_ta: "",
    anh_dai_dien: "",
    trang_thai: "Bản nháp",
    chuong: [],
  };
}

function createLesson(thuTu: number): TeacherCourseFormValues["chuong"][number]["bai_hoc"][number] {
  return {
    id: crypto.randomUUID(),
    tieu_de: "",
    thu_tu: thuTu,
    noi_dung_van_ban: "",
    duong_dan_anh: "",
    lien_ket_video: "",
    bat_buoc: true,
  };
}

function createChapter(thuTu: number): TeacherCourseFormValues["chuong"][number] {
  return {
    id: crypto.randomUUID(),
    tieu_de: "",
    thu_tu: thuTu,
    bai_hoc: [],
  };
}

export default function TeacherCourseFormPage() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const isEditing = Boolean(courseId);
  const [course, setCourse] = useState<TeacherCourseFormValues>(() => (
    isEditing ? teacherCourseFormSchema.parse(sampleTeacherCourse) : createEmptyCourse()
  ));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  if (!user) return null;
  const displayName = getDisplayName(user);

  function updateChapter(
    chapterIndex: number,
    update: (chapter: TeacherCourseFormValues["chuong"][number]) => TeacherCourseFormValues["chuong"][number]
  ) {
    setCourse((current) => ({
      ...current,
      chuong: current.chuong.map((chapter, index) => index === chapterIndex ? update(chapter) : chapter),
    }));
    setSuccessMessage(null);
  }

  function updateLesson(
    chapterIndex: number,
    lessonIndex: number,
    update: (lesson: TeacherCourseFormValues["chuong"][number]["bai_hoc"][number]) => TeacherCourseFormValues["chuong"][number]["bai_hoc"][number]
  ) {
    updateChapter(chapterIndex, (chapter) => ({
      ...chapter,
      bai_hoc: chapter.bai_hoc.map((lesson, index) => index === lessonIndex ? update(lesson) : lesson),
    }));
  }

  function getError(field: string) {
    return errors[field] ? <span className="teacher-field-error" role="alert">{errors[field]}</span> : null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = teacherCourseFormSchema.safeParse(course);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".");
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      setSuccessMessage(null);
      return;
    }

    setErrors({});
    setSuccessMessage(isEditing ? "Đã kiểm tra hợp lệ. Tính năng lưu khóa học đang được phát triển." : "Đã kiểm tra hợp lệ. Tính năng tạo khóa học đang được phát triển.");
  }

  return (
    <div className="settings-shell">
      <Sidebar user={user} displayName={displayName} initials={getInitials(displayName)} />
      <main className="settings-main teacher-form-main">
        <div className="settings-content">
          <header className="settings-page-heading teacher-form-heading">
            <div>
              <p className="settings-eyebrow">KHÔNG GIAN GIÁO VIÊN</p>
              <h1>{isEditing ? "Chỉnh sửa khóa học" : "Tạo khóa học"}</h1>
              <p>Soạn nội dung và sắp xếp chương trình học của bạn.</p>
            </div>
            <Link className="button button-outline" to="/my-courses">Hủy</Link>
          </header>

          <form className="teacher-course-form" noValidate onSubmit={handleSubmit}>
            <section className="settings-card teacher-form-section" aria-labelledby="course-details-title">
              <h2 id="course-details-title">Thông tin khóa học</h2>
              <label className="teacher-form-field" htmlFor="course-title">
                Tiêu đề khóa học
                <input
                  id="course-title"
                  value={course.tieu_de}
                  maxLength={200}
                  aria-invalid={Boolean(errors.tieu_de)}
                  aria-describedby={errors.tieu_de ? "course-title-error" : undefined}
                  onChange={(event) => {
                    setCourse((current) => ({ ...current, tieu_de: event.target.value }));
                    setErrors((current) => ({ ...current, tieu_de: "" }));
                    setSuccessMessage(null);
                  }}
                />
                {errors.tieu_de && <span id="course-title-error" className="teacher-field-error" role="alert">{errors.tieu_de}</span>}
              </label>

              <div className="teacher-form-grid">
                <label className="teacher-form-field" htmlFor="course-level">
                  Cấp độ
                  <select
                    id="course-level"
                    value={course.cap_do}
                    onChange={(event) => setCourse((current) => ({ ...current, cap_do: event.target.value as TeacherCourseFormValues["cap_do"] }))}
                  >
                    {courseLevels.map((level) => <option key={level} value={level}>{level}</option>)}
                  </select>
                </label>
                <label className="teacher-form-field" htmlFor="course-topic">
                  Chủ đề
                  <input
                    id="course-topic"
                    value={course.chu_de}
                    onChange={(event) => setCourse((current) => ({ ...current, chu_de: event.target.value }))}
                  />
                </label>
                <label className="teacher-form-field" htmlFor="course-status">
                  Trạng thái
                  <select
                    id="course-status"
                    value={course.trang_thai}
                    onChange={(event) => setCourse((current) => ({ ...current, trang_thai: event.target.value as TeacherCourseFormValues["trang_thai"] }))}
                  >
                    {courseStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
              </div>

              <label className="teacher-form-field" htmlFor="course-description">
                Mô tả
                <textarea
                  id="course-description"
                  rows={5}
                  maxLength={2000}
                  value={course.mo_ta}
                  aria-invalid={Boolean(errors.mo_ta)}
                  onChange={(event) => {
                    setCourse((current) => ({ ...current, mo_ta: event.target.value }));
                    setErrors((current) => ({ ...current, mo_ta: "" }));
                  }}
                />
                {getError("mo_ta")}
              </label>

              <label className="teacher-form-field" htmlFor="course-cover">
                Đường dẫn ảnh đại diện
                <input
                  id="course-cover"
                  type="url"
                  value={course.anh_dai_dien}
                  onChange={(event) => setCourse((current) => ({ ...current, anh_dai_dien: event.target.value }))}
                />
              </label>
              {course.anh_dai_dien && (
                <div className="teacher-cover-preview">
                  <img src={course.anh_dai_dien} alt={`Ảnh xem trước: ${course.tieu_de || "khóa học"}`} />
                </div>
              )}
            </section>

            <section className="settings-card teacher-form-section" aria-labelledby="course-content-title">
              <div className="teacher-section-heading">
                <div>
                  <h2 id="course-content-title">Nội dung khóa học</h2>
                  <p>Thêm chương và bài học, thứ tự sẽ được cập nhật tự động.</p>
                </div>
                <button
                  className="button button-outline"
                  type="button"
                  onClick={() => setCourse((current) => ({
                    ...current,
                    chuong: resequence([...current.chuong, createChapter(current.chuong.length + 1)]),
                  }))}
                >
                  <Plus aria-hidden="true" size={15} />
                  Thêm chương
                </button>
              </div>

              {course.chuong.map((chapter, chapterIndex) => (
                <article className="teacher-chapter" key={chapter.id}>
                  <div className="teacher-chapter-toolbar">
                    <span className="teacher-chapter-number">Chương {chapter.thu_tu}</span>
                    <div className="teacher-order-actions">
                      <button
                        className="teacher-icon-button"
                        type="button"
                        aria-label={`Đưa chương ${chapter.thu_tu} lên`}
                        disabled={chapterIndex === 0}
                        onClick={() => setCourse((current) => ({ ...current, chuong: moveAndResequence(current.chuong, chapterIndex, -1) }))}
                      >
                        <ArrowUp aria-hidden="true" size={16} />
                      </button>
                      <button
                        className="teacher-icon-button"
                        type="button"
                        aria-label={`Đưa chương ${chapter.thu_tu} xuống`}
                        disabled={chapterIndex === course.chuong.length - 1}
                        onClick={() => setCourse((current) => ({ ...current, chuong: moveAndResequence(current.chuong, chapterIndex, 1) }))}
                      >
                        <ArrowDown aria-hidden="true" size={16} />
                      </button>
                      <button
                        className="teacher-icon-button teacher-delete-button"
                        type="button"
                        aria-label={`Xóa chương ${chapter.thu_tu}`}
                        onClick={() => setCourse((current) => ({ ...current, chuong: resequence(current.chuong.filter((_, index) => index !== chapterIndex)) }))}
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    </div>
                  </div>
                  <label className="teacher-form-field" htmlFor={`chapter-title-${chapter.id}`}>
                    Tiêu đề chương
                    <input
                      id={`chapter-title-${chapter.id}`}
                      value={chapter.tieu_de}
                      onChange={(event) => updateChapter(chapterIndex, (current) => ({ ...current, tieu_de: event.target.value }))}
                    />
                  </label>

                  <div className="teacher-lesson-list">
                    {chapter.bai_hoc.map((lesson, lessonIndex) => (
                      <div className="teacher-lesson" key={lesson.id}>
                        <div className="teacher-chapter-toolbar">
                          <span className="teacher-lesson-number">Bài học {lesson.thu_tu}</span>
                          <div className="teacher-order-actions">
                            <button
                              className="teacher-icon-button"
                              type="button"
                              aria-label={`Đưa bài học ${lesson.thu_tu} lên`}
                              disabled={lessonIndex === 0}
                              onClick={() => updateChapter(chapterIndex, (current) => ({
                                ...current,
                                bai_hoc: moveAndResequence(current.bai_hoc, lessonIndex, -1),
                              }))}
                            >
                              <ArrowUp aria-hidden="true" size={15} />
                            </button>
                            <button
                              className="teacher-icon-button"
                              type="button"
                              aria-label={`Đưa bài học ${lesson.thu_tu} xuống`}
                              disabled={lessonIndex === chapter.bai_hoc.length - 1}
                              onClick={() => updateChapter(chapterIndex, (current) => ({
                                ...current,
                                bai_hoc: moveAndResequence(current.bai_hoc, lessonIndex, 1),
                              }))}
                            >
                              <ArrowDown aria-hidden="true" size={15} />
                            </button>
                            <button
                              className="teacher-icon-button teacher-delete-button"
                              type="button"
                              aria-label={`Xóa bài học ${lesson.thu_tu}`}
                              onClick={() => updateChapter(chapterIndex, (current) => ({
                                ...current,
                                bai_hoc: resequence(current.bai_hoc.filter((_, index) => index !== lessonIndex)),
                              }))}
                            >
                              <Trash2 aria-hidden="true" size={15} />
                            </button>
                          </div>
                        </div>
                        <label className="teacher-form-field" htmlFor={`lesson-title-${lesson.id}`}>
                          Tiêu đề bài học
                          <input
                            id={`lesson-title-${lesson.id}`}
                            value={lesson.tieu_de}
                            onChange={(event) => updateLesson(chapterIndex, lessonIndex, (current) => ({ ...current, tieu_de: event.target.value }))}
                          />
                        </label>
                        <label className="teacher-form-field" htmlFor={`lesson-text-${lesson.id}`}>
                          Nội dung văn bản
                          <textarea
                            id={`lesson-text-${lesson.id}`}
                            rows={3}
                            value={lesson.noi_dung_van_ban}
                            onChange={(event) => updateLesson(chapterIndex, lessonIndex, (current) => ({ ...current, noi_dung_van_ban: event.target.value }))}
                          />
                        </label>
                        <div className="teacher-form-grid">
                          <label className="teacher-form-field" htmlFor={`lesson-image-${lesson.id}`}>
                            Đường dẫn ảnh
                            <input
                              id={`lesson-image-${lesson.id}`}
                              type="url"
                              value={lesson.duong_dan_anh}
                              onChange={(event) => updateLesson(chapterIndex, lessonIndex, (current) => ({ ...current, duong_dan_anh: event.target.value }))}
                            />
                          </label>
                          <label className="teacher-form-field" htmlFor={`lesson-video-${lesson.id}`}>
                            Liên kết video
                            <input
                              id={`lesson-video-${lesson.id}`}
                              type="url"
                              value={lesson.lien_ket_video}
                              aria-invalid={Boolean(errors[`chuong.${chapterIndex}.bai_hoc.${lessonIndex}.lien_ket_video`])}
                              onChange={(event) => updateLesson(chapterIndex, lessonIndex, (current) => ({ ...current, lien_ket_video: event.target.value }))}
                            />
                            {getError(`chuong.${chapterIndex}.bai_hoc.${lessonIndex}.lien_ket_video`)}
                          </label>
                        </div>
                        <label className="teacher-required-toggle">
                          <input
                            type="checkbox"
                            checked={lesson.bat_buoc}
                            onChange={(event) => updateLesson(chapterIndex, lessonIndex, (current) => ({ ...current, bat_buoc: event.target.checked }))}
                          />
                          Bài học bắt buộc
                        </label>
                      </div>
                    ))}
                  </div>
                  <button
                    className="button button-outline teacher-add-lesson"
                    type="button"
                    onClick={() => updateChapter(chapterIndex, (current) => ({
                      ...current,
                      bai_hoc: resequence([...current.bai_hoc, createLesson(current.bai_hoc.length + 1)]),
                    }))}
                  >
                    <Plus aria-hidden="true" size={15} />
                    Thêm bài học
                  </button>
                </article>
              ))}
            </section>

            {successMessage && <p className="teacher-form-success" role="status">{successMessage}</p>}
            <div className="teacher-form-actions">
              <Link className="button button-outline" to="/my-courses">Hủy</Link>
              <button className="button button-primary" type="submit">
                <ImagePlus aria-hidden="true" size={16} />
                Lưu
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
