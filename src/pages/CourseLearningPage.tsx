import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Clock3, PlayCircle, Target } from "lucide-react";
import { z } from "zod";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
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
  const userId = user?.id;
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
    const lookup = !supabase
      ? Promise.reject(new Error("Supabase is not configured"))
      : (async () => {
          const courseQuery = supabase
            .from("khoa_hoc")
            .select("ma_khoa_hoc, tieu_de, mo_ta, cap_do, chu_de, anh_dai_dien, ma_giao_vien")
            .eq("trang_thai", "DA_DANG");
          const { data: courseRows, error: courseError } = /^\d+$/.test(courseId)
            ? await courseQuery.eq("ma_khoa_hoc", Number(courseId)).limit(1)
            : await courseQuery.eq("tieu_de", courseTitles[courseId]).limit(1);
          if (courseError) throw courseError;
          const courseRow = courseRows?.[0];
          if (!courseRow) return null;

          const { data: enrollment, error: enrollmentError } = await supabase
            .from("ghi_danh")
            .select("trang_thai")
            .eq("ma_khoa_hoc", courseRow.ma_khoa_hoc)
            .eq("ma_nguoi_dung", userId)
            .maybeSingle();
          if (enrollmentError) throw enrollmentError;

          const { data: chapters, error: chapterError } = await supabase
            .from("chuong")
            .select("ma_chuong, tieu_de, thu_tu")
            .eq("ma_khoa_hoc", courseRow.ma_khoa_hoc)
            .order("thu_tu");
          if (chapterError && enrollment) throw chapterError;

          const chapterRows = chapters ?? [];
          const { data: lessons, error: lessonError } = chapterRows.length
            ? await supabase.from("bai_hoc")
              .select("ma_bai_hoc, ma_chuong, tieu_de, thu_tu")
              .in("ma_chuong", chapterRows.map((chapter) => chapter.ma_chuong))
              .order("thu_tu")
            : { data: [], error: null };
          if (lessonError && enrollment) throw lessonError;

          const lessonRows = lessons ?? [];
          const { data: progressRows, error: progressError } = await supabase
            .from("tien_do_bai_hoc")
            .select("ma_bai_hoc, trang_thai")
            .eq("ma_nguoi_dung", userId)
            .in("ma_bai_hoc", lessonRows.map((lesson) => lesson.ma_bai_hoc));
          if (progressError && enrollment && lessonRows.length) throw progressError;
          const progress = new Map((progressRows ?? []).map((row) => [row.ma_bai_hoc, row.trang_thai]));
          const mappedChapters = chapterRows.map((chapter) => ({
            ma_chuong: chapter.ma_chuong,
            tieu_de: chapter.tieu_de,
            thu_tu: chapter.thu_tu,
            bai_hoc: lessonRows
              .filter((lesson) => lesson.ma_chuong === chapter.ma_chuong)
              .map((lesson) => ({
                ma_bai_hoc: lesson.ma_bai_hoc,
                tieu_de: lesson.tieu_de,
                thu_tu: lesson.thu_tu,
                trang_thai: progress.get(lesson.ma_bai_hoc) ?? "CHUA_HOC",
              })),
          }));
          const completed = lessonRows.filter((lesson) => progress.get(lesson.ma_bai_hoc) === "DA_HOAN_THANH").length;
          return {
            ma_khoa_hoc: courseRow.ma_khoa_hoc,
            tieu_de: courseRow.tieu_de,
            mo_ta: courseRow.mo_ta,
            cap_do: courseRow.cap_do,
            chu_de: courseRow.chu_de,
            da_ghi_danh: enrollment?.trang_thai === "DANG_HOC" || enrollment?.trang_thai === "HOAN_THANH",
            phan_tram: lessonRows.length ? Math.round(completed * 100 / lessonRows.length) : 0,
            chuong: mappedChapters,
          };
        })();
    void lookup.then((id) => {
      if (id === null) throw new Error("Course not found");
      const parsed = courseSchema.parse(id);
      setResolvedCourseId(String(parsed.ma_khoa_hoc));
      return parsed;
    }).then((parsed) => {
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
    const client = supabase;
    if (!token || !client || !resolvedCourseId || !Number.isFinite(currentLessonId) || !course?.da_ghi_danh || !userId) return;
    let active = true;
    void Promise.resolve(client.from("bai_hoc")
      .select("ma_bai_hoc, ma_chuong, tieu_de, noi_dung_van_ban, duong_dan_anh, lien_ket_video, bat_buoc")
      .eq("ma_bai_hoc", currentLessonId)
      .maybeSingle())
      .then(({ data, error }) => {
        if (error || !data) throw error ?? new Error("Lesson not found");
        const chapter = course.chuong.find((item) => item.ma_chuong === data.ma_chuong);
        if (!chapter) throw new Error("Lesson is outside this course");
        return client.from("tien_do_bai_hoc").select("trang_thai")
          .eq("ma_nguoi_dung", userId).eq("ma_bai_hoc", currentLessonId).maybeSingle()
          .then(({ data: progress, error: progressError }) => {
            if (progressError) throw progressError;
            return lessonContentSchema.parse({
              ...data,
              ma_khoa_hoc: Number(resolvedCourseId),
              trang_thai: progress?.trang_thai ?? "CHUA_HOC",
              phan_tram: progress?.trang_thai === "DA_HOAN_THANH" ? 100 : 0,
            });
          });
      })
      .then((value) => active && setLesson(value))
      .catch(() => active && setError("Không thể tải nội dung bài học."));
    return () => { active = false; };
  }, [resolvedCourseId, currentLessonId, course?.da_ghi_danh, token, userId]);

  if (!user) return null;
  const displayName = user.user_metadata.display_name || user.email?.split("@")[0] || "Học viên LINEA";
  const currentIndex = lessons.findIndex((item) => item.ma_bai_hoc === currentLessonId);

  async function enroll() {
    if (!token || !resolvedCourseId) return;
    setSaving(true);
    try {
      if (!supabase) throw new Error("Supabase is not configured");
      const { error } = await supabase.from("ghi_danh").upsert({
        ma_nguoi_dung: userId,
        ma_khoa_hoc: Number(resolvedCourseId),
        trang_thai: "DANG_HOC",
        ngay_ghi_danh: new Date().toISOString(),
      }, { onConflict: "ma_nguoi_dung,ma_khoa_hoc" });
      if (error) throw error;
      setCourse((value) => value ? { ...value, da_ghi_danh: true } : value);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Không thể ghi danh khóa học.");
    } finally {
      setSaving(false);
    }
  }

  async function completeLesson() {
    if (!token || !resolvedCourseId || !lesson) return;
    setSaving(true);
    try {
      if (!supabase) throw new Error("Supabase is not configured");
      const now = new Date().toISOString();
      const { error } = await supabase.from("tien_do_bai_hoc").upsert({
        ma_nguoi_dung: userId,
        ma_bai_hoc: lesson.ma_bai_hoc,
        trang_thai: "DA_HOAN_THANH",
        ngay_bat_dau: now,
        ngay_hoan_thanh: now,
      }, { onConflict: "ma_nguoi_dung,ma_bai_hoc" });
      if (error) throw error;
      setCourse((value) => {
        if (!value) return value;
        const totalLessons = lessons.length;
        const completedLessons = lessons.filter((item) =>
          item.ma_bai_hoc === lesson.ma_bai_hoc || item.trang_thai === "DA_HOAN_THANH").length;
        return {
          ...value,
          phan_tram: totalLessons ? Math.round(completedLessons * 100 / totalLessons) : 0,
          chuong: value.chuong.map((chapter) => ({
            ...chapter,
            bai_hoc: chapter.bai_hoc.map((item) =>
              item.ma_bai_hoc === lesson.ma_bai_hoc
                ? { ...item, trang_thai: "DA_HOAN_THANH" }
                : item),
          })),
        };
      });
      setLesson((value) => value ? { ...value, trang_thai: "DA_HOAN_THANH" } : value);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Không thể lưu tiến độ. Vui lòng thử lại.");
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
                <div className="learner-course-layout">
                  <section className="learner-course-hero">
                    <div className="learner-course-hero-art"><PlayCircle size={42} /></div>
                    <div className="learner-course-hero-copy">
                      <p className="settings-eyebrow">TIẾP TỤC HÀNH TRÌNH CỦA BẠN</p>
                      <h2>{lesson?.tieu_de || lessons[0]?.tieu_de || "Chưa có bài học"}</h2>
                      <p>{lesson?.noi_dung_van_ban || "Chọn một bài học trong lộ trình để bắt đầu luyện tập."}</p>
                      <div className="learner-course-hero-actions">
                        {lesson && <button className="button button-primary" onClick={() => void completeLesson()} disabled={saving || lesson.trang_thai === "DA_HOAN_THANH"}>{lesson.trang_thai === "DA_HOAN_THANH" ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}</button>}
                        {lessons.length > 0 && <button className="button button-outline" onClick={() => navigate(`/courses/${course.ma_khoa_hoc}/learn/${lessons[currentIndex < 0 ? 0 : currentIndex].ma_bai_hoc}`)}>Học tiếp</button>}
                      </div>
                    </div>
                  </section>
                  <div className="learner-course-pills"><span>Đang học</span><span>{course.cap_do}</span><span><Clock3 size={14} /> {lessons.length} bài học</span><span><Target size={14} /> {course.phan_tram}% hoàn thành</span></div>
                  <div className="learner-course-columns">
                    <section className="course-module-card">
                      <div className="learner-card-heading"><div><h2>Nội dung khóa học</h2><p>{course.chuong.length} chương · {lessons.length} bài học</p></div><strong>{course.phan_tram}%</strong></div>
                      {course.chuong.map((chapter) => {
                        const done = chapter.bai_hoc.filter((item) => item.trang_thai === "DA_HOAN_THANH").length;
                        return <div className="learner-chapter" key={chapter.ma_chuong}>
                          <div className="learner-chapter-heading"><span className="learner-chapter-number">{String(chapter.thu_tu).padStart(2, "0")}</span><div><strong>{chapter.tieu_de}</strong><small>{done}/{chapter.bai_hoc.length} bài · {done ? "Đang học" : "Chưa bắt đầu"}</small></div><span>{done}/{chapter.bai_hoc.length}</span></div>
                          {chapter.bai_hoc.map((item) => <button className={`learner-lesson${item.ma_bai_hoc === currentLessonId ? " active" : ""}`} type="button" key={item.ma_bai_hoc} onClick={() => navigate(`/courses/${course.ma_khoa_hoc}/learn/${item.ma_bai_hoc}`)}><span className="learner-lesson-check">{item.trang_thai === "DA_HOAN_THANH" ? <Check size={13} /> : item.thu_tu}</span><span><strong>Bài {String(item.thu_tu).padStart(2, "0")} · {item.tieu_de}</strong><small>{item.trang_thai === "DA_HOAN_THANH" ? "Đã hoàn thành" : item.ma_bai_hoc === currentLessonId ? "Đang học" : "Chưa bắt đầu"}</small></span><span>{item.ma_bai_hoc === currentLessonId ? "Học tiếp →" : item.trang_thai === "DA_HOAN_THANH" ? "Xem lại" : "Chưa mở"}</span></button>)}
                        </div>;
                      })}
                    </section>
                    <aside className="learner-course-sidebar">
                      <section className="learner-side-card"><h2>Tiến độ của bạn</h2><strong className="learner-progress-number">{course.phan_tram}%</strong><p>{lessons.filter((item) => item.trang_thai === "DA_HOAN_THANH").length} / {lessons.length} bài học hoàn thành</p><div className="course-progress-track"><span style={{ width: `${course.phan_tram}%` }} /></div></section>
                      <section className="learner-side-card"><h2>Bạn sẽ học được</h2><ul><li>Nắm các nguyên tắc cốt lõi</li><li>Thực hành qua bài tập ngắn</li><li>Hoàn thiện nét vẽ tự tin hơn</li></ul></section>
                    </aside>
                  </div>
                  {lesson && <section className="learner-lesson-content"><div><h2>{lesson.tieu_de}</h2><p>{lesson.noi_dung_van_ban || "Bài học chưa có nội dung văn bản."}</p></div><div className="learner-lesson-navigation"><button className="button button-outline" disabled={currentIndex <= 0} onClick={() => navigate(`/courses/${course.ma_khoa_hoc}/learn/${lessons[currentIndex - 1].ma_bai_hoc}`)}><ChevronLeft size={15} /> Bài trước</button><button className="button button-outline" disabled={currentIndex < 0 || currentIndex >= lessons.length - 1} onClick={() => navigate(`/courses/${course.ma_khoa_hoc}/learn/${lessons[currentIndex + 1].ma_bai_hoc}`)}>Bài sau <ChevronRight size={15} /></button></div></section>}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
