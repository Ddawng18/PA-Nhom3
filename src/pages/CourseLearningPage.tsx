import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { z } from "zod";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { requestAdminApi } from "../lib/adminApi";
import { enrollInCourse } from "../lib/courseApi";
import "../styles/settings.css";

const lessonSchema = z.object({
  ma_bai_hoc: z.number().int(),
  tieu_de: z.string(),
  thu_tu: z.number().int(),
  trang_thai: z.string(),
});
const chapterSchema = z.object({
  ma_chuong: z.number().int(),
  tieu_de: z.string(),
  thu_tu: z.number().int(),
  bai_hoc: z.array(lessonSchema),
});
const courseSchema = z.object({
  ma_khoa_hoc: z.number().int(),
  tieu_de: z.string(),
  mo_ta: z.string(),
  cap_do: z.string(),
  chu_de: z.string(),
  da_ghi_danh: z.boolean(),
  phan_tram: z.number().int(),
  chuong: z.array(chapterSchema),
});
const lessonContentSchema = z.object({
  ma_bai_hoc: z.number().int(),
  ma_khoa_hoc: z.number().int(),
  ma_chuong: z.number().int(),
  tieu_de: z.string(),
  noi_dung_van_ban: z.string().nullable(),
  duong_dan_anh: z.string().nullable(),
  lien_ket_video: z.string().nullable(),
  trang_thai: z.string(),
});
type Course = z.infer<typeof courseSchema>;

const courseTitles: Record<string, string> = {
  "line-control": "Kiểm soát nét",
  "shape-form": "Hình khối và dựng hình",
  "perspective-space": "Phối cảnh và không gian",
  "light-color": "Ánh sáng và sắc độ",
  "character-design": "Nhân vật và nét viền",
  "gesture-masterclass": "Gesture và dáng chuyển động",
  "digital-color": "Màu kỹ thuật số cho minh họa",
};

export default function CourseLearningPage() {
  const { courseId, lessonId } = useParams();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const token = session?.access_token;
  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<z.infer<typeof lessonContentSchema> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolvedCourseId, setResolvedCourseId] = useState(courseId);

  useEffect(() => {
    if (!token || !courseId) return;
    let active = true;
    setLoading(true);
    const lookup = /^\d+$/.test(courseId)
      ? Promise.resolve(Number(courseId))
      : requestAdminApi("/api/courses", { token }, { search: courseTitles[courseId], page: 1, pageSize: 10 })
        .then((payload) => {
          const result = z.object({ items: z.array(z.object({ ma_khoa_hoc: z.number().int(), tieu_de: z.string() })) }).parse(payload);
          return result.items.find((item) => item.tieu_de === courseTitles[courseId])?.ma_khoa_hoc ?? null;
        });
    void lookup.then((id) => {
      if (id === null) throw new Error("Course not found");
      setResolvedCourseId(String(id));
      return requestAdminApi(`/api/courses/${id}/learning`, { token });
    })
      .then((payload) => {
        const parsed = courseSchema.parse(payload);
        if (active) setCourse(parsed);
      })
      .catch(() => active && setError("Không thể tải khóa học. Vui lòng thử lại."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [courseId, token]);

  const lessons = useMemo(
    () => course?.chuong.flatMap((chapter) => chapter.bai_hoc) ?? [],
    [course],
  );
  const currentLessonId = Number(lessonId ?? lessons[0]?.ma_bai_hoc);

  useEffect(() => {
    if (!token || !resolvedCourseId || !Number.isFinite(currentLessonId) || !course?.da_ghi_danh) return;
    let active = true;
    void requestAdminApi(`/api/courses/${resolvedCourseId}/lessons/${currentLessonId}`, { token })
      .then((payload) => active && setLesson(lessonContentSchema.parse(payload)))
      .catch(() => active && setError("Không thể tải nội dung bài học."));
    return () => { active = false; };
  }, [resolvedCourseId, currentLessonId, course?.da_ghi_danh, token]);

  if (!user) return null;
  const displayName = user.user_metadata.display_name || user.email?.split("@")[0] || "Học viên LINEA";
  const currentIndex = lessons.findIndex((item) => item.ma_bai_hoc === currentLessonId);

  async function enroll() {
    if (!token || !resolvedCourseId) return;
    setSaving(true);
    try {
      await enrollInCourse(token, resolvedCourseId);
      setCourse((value) => value ? { ...value, da_ghi_danh: true } : value);
    } catch {
      setError("Không thể ghi danh khóa học.");
    } finally {
      setSaving(false);
    }
  }

  async function completeLesson() {
    if (!token || !resolvedCourseId || !lesson) return;
    setSaving(true);
    try {
      await requestAdminApi(`/api/courses/${resolvedCourseId}/lessons/${lesson.ma_bai_hoc}/progress`, {
        token, method: "PUT", body: { trang_thai: "DA_HOAN_THANH" },
      });
      setCourse((value) => value ? { ...value, phan_tram: Math.max(value.phan_tram, 0) } : value);
      setLesson((value) => value ? { ...value, trang_thai: "DA_HOAN_THANH" } : value);
    } catch {
      setError("Không thể lưu tiến độ. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-shell">
      <Sidebar user={user} displayName={displayName} initials={displayName.slice(0, 2).toUpperCase()} />
      <main className="settings-main">
        <div className="settings-content course-detail">
          <Link className="course-back-button" to="/my-courses"><ArrowLeft size={16} /> Khóa học của tôi</Link>
          {loading && <p className="auth-loading" role="status">Đang tải khóa học...</p>}
          {error && <p className="settings-error" role="alert">{error}</p>}
          {!loading && course && (
            <>
              <header className="course-detail-heading">
                <div><p className="settings-eyebrow">{course.chu_de} · {course.cap_do}</p><h1>{course.tieu_de}</h1><p>{course.mo_ta}</p></div>
              </header>
              {!course.da_ghi_danh ? (
                <button className="button button-primary" type="button" onClick={() => void enroll()} disabled={saving}>Tham gia khóa học</button>
              ) : (
                <div className="course-detail-grid">
                  <aside className="course-module-card">
                    <h2>Nội dung khóa học · {course.phan_tram}%</h2>
                    {course.chuong.map((chapter) => (
                      <div className="course-module-list" key={chapter.ma_chuong}>
                        <strong>{chapter.tieu_de}</strong>
                        {chapter.bai_hoc.map((item) => (
                          <button className="course-module" type="button" key={item.ma_bai_hoc} onClick={() => navigate(`/courses/${course.ma_khoa_hoc}/learn/${item.ma_bai_hoc}`)}>
                            <span>{item.tieu_de}</span>{item.trang_thai === "DA_HOAN_THANH" && <Check size={15} />}
                          </button>
                        ))}
                      </div>
                    ))}
                  </aside>
                  <section className="course-resource-card">
                    {lesson ? <><h2>{lesson.tieu_de}</h2><p>{lesson.noi_dung_van_ban || "Bài học chưa có nội dung văn bản."}</p><button className="button button-primary" onClick={() => void completeLesson()} disabled={saving || lesson.trang_thai === "DA_HOAN_THANH"}>{lesson.trang_thai === "DA_HOAN_THANH" ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}</button><div><button className="button button-outline" disabled={currentIndex <= 0} onClick={() => navigate(`/courses/${course.ma_khoa_hoc}/learn/${lessons[currentIndex - 1].ma_bai_hoc}`)}><ChevronLeft size={15} /> Bài trước</button> <button className="button button-outline" disabled={currentIndex < 0 || currentIndex >= lessons.length - 1} onClick={() => navigate(`/courses/${course.ma_khoa_hoc}/learn/${lessons[currentIndex + 1].ma_bai_hoc}`)}>Bài sau <ChevronRight size={15} /></button></div></> : <p>Chọn một bài học để bắt đầu.</p>}
                  </section>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
