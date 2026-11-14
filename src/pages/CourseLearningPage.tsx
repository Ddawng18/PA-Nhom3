import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import LessonAssignments from "../components/LessonAssignments";
import { enrollInCourse } from "../lib/courseApi";
import { loadLearningCourse, loadLesson, updateLesson, learningError, type LearningCourse, type LessonContent } from "../lib/learningApi";
import { getCourseLevelLabel } from "../logic/courseEditor";
import "../styles/settings.css";
import "../styles/learning.css";

function safeHttps(value: string | null) {
  try { const url = new URL(value ?? ""); return url.protocol === "https:" ? url.href : undefined; } catch { return undefined; }
}
function embedVideo(value: string | null) {
  const href = safeHttps(value); if (!href) return undefined;
  const url = new URL(href);
  const hosts = ["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com"];
  const videoId = url.hostname === "youtu.be" ? url.pathname.slice(1) : hosts.includes(url.hostname)
    ? url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/)?.[1] : undefined;
  if (videoId && /^[\w-]{11}$/.test(videoId)) return `https://www.youtube-nocookie.com/embed/${videoId}`;
  if (url.hostname === "player.vimeo.com" && /^\/video\/\d+$/.test(url.pathname)) return url.href;
  if (url.hostname === "vimeo.com" && /^\/\d+$/.test(url.pathname)) return `https://player.vimeo.com/video${url.pathname}`;
  return undefined;
}

export default function CourseLearningPage() {
  const { courseId, lessonId } = useParams();
  return <CourseLearningView key={`${courseId}:${lessonId ?? "overview"}`} />;
}

function CourseLearningView() {
  const { user, session } = useAuth();
  const token = session?.access_token;
  const { courseId = "", lessonId } = useParams();
  const [course, setCourse] = useState<LearningCourse | null>(null);
  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [error, setError] = useState("");
  const [lessonError, setLessonError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [lessonAttempt, setLessonAttempt] = useState(0);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController(); setLoading(true); setCourse(null); setError(""); setActionError("");
    void loadLearningCourse(token, courseId, controller.signal).then(data => { if (!controller.signal.aborted) setCourse(data); })
      .catch(e => { if (!controller.signal.aborted) setError(learningError(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, courseId, attempt]);
  const enrolled = Boolean(course?.da_ghi_danh);
  useEffect(() => {
    setLesson(null); setLessonError("");
    if (!token || !lessonId || !enrolled) return;
    const controller = new AbortController(); setLessonLoading(true);
    async function load() {
      const data = await loadLesson(token!, courseId, lessonId!, controller.signal);
      if (controller.signal.aborted) return;
      setLesson(data);
      if (data.trang_thai !== "DA_HOAN_THANH") await updateLesson(token!, courseId, lessonId!, "DANG_HOC", controller.signal);
    }
    void load().catch(e => { if (!controller.signal.aborted) setLessonError(learningError(e)); })
      .finally(() => { if (!controller.signal.aborted) setLessonLoading(false); });
    return () => controller.abort();
  }, [token, courseId, lessonId, enrolled, lessonAttempt]);
  if (!user || !token) return null;
  const name = typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : user.email ?? "Học viên";
  const lessons = course?.chuong.flatMap(c => c.bai_hoc) ?? [];
  const currentIndex = lessons.findIndex(l => String(l.ma_bai_hoc) === lessonId);
  const resume = lessons.find(l => l.trang_thai === "DANG_HOC") ?? lessons.find(l => l.trang_thai !== "DA_HOAN_THANH") ?? lessons[0];
  const video = embedVideo(lesson?.lien_ket_video ?? null);
  async function enroll() {
    setBusy(true); setActionError("");
    try { await enrollInCourse(token!, courseId); setAttempt(v => v + 1); } catch (e) { setActionError(learningError(e)); } finally { setBusy(false); }
  }
  async function complete() {
    setBusy(true); setActionError("");
    try {
      await updateLesson(token!, courseId, lessonId!, "DA_HOAN_THANH");
      const updated = await loadLearningCourse(token!, courseId);
      setCourse(updated); setLesson(l => l ? { ...l, trang_thai: "DA_HOAN_THANH" } : l);
    } catch (e) { setActionError(learningError(e)); } finally { setBusy(false); }
  }
  return <div className="settings-shell"><Sidebar user={user} displayName={name} initials={name.slice(0, 2).toUpperCase()} />
    <main className="settings-main"><div className="settings-content learning-content">
      <Link to={lessonId ? `/courses/${courseId}` : "/my-courses"}>← {lessonId ? "Nội dung khóa học" : "Khóa học của tôi"}</Link>
      {loading ? <p role="status">Đang tải khóa học...</p> : error ? <section className="settings-card"><p role="alert">{error}</p><button onClick={() => setAttempt(v => v + 1)}>Thử lại</button></section> : course && <>
        <header className="settings-page-heading"><div><p className="settings-eyebrow">{getCourseLevelLabel(course.cap_do)} · {course.chu_de}</p><h1>{course.tieu_de}</h1></div></header>
        {actionError && <p className="settings-error" role="alert">{actionError}</p>}
        {!enrolled ? <section className="settings-card"><p className="learning-text">{course.mo_ta}</p><p>Ghi danh để học và nộp bài tập.</p><button className="button button-primary" disabled={busy} onClick={() => void enroll()}>{busy ? "Đang ghi danh..." : "Ghi danh khóa học"}</button></section>
          : <section className="settings-card"><label>Tiến độ bài học: {course.phan_tram}% <progress value={course.phan_tram} max={100} /></label>
            <p>{course.trang_thai_ghi_danh === "HOAN_THANH" ? "Bạn đã hoàn thành khóa học. Bạn có thể xem lại toàn bộ bài học." : "Hoàn thành các bài học bắt buộc và được chấm tất cả bài tập bắt buộc để hoàn thành khóa."}</p>
            {resume && !lessonId && <Link className="button button-primary" to={`/courses/${courseId}/learn/${resume.ma_bai_hoc}`}>{course.trang_thai_ghi_danh === "HOAN_THANH" ? "Xem lại bài học" : "Tiếp tục học"}</Link>}
          </section>}
        {lessonId && enrolled ? <>
          {lessonLoading ? <p role="status">Đang tải bài học...</p> : lessonError ? <section className="settings-card"><p role="alert">{lessonError}</p><button onClick={() => setLessonAttempt(v => v + 1)}>Thử lại</button></section> : lesson && <>
            <article className="settings-card"><h2>{lesson.tieu_de}</h2>
              {video ? <iframe className="learning-video" src={video} title={lesson.tieu_de} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                : safeHttps(lesson.lien_ket_video) && <a className="button button-outline" href={safeHttps(lesson.lien_ket_video)} target="_blank" rel="noreferrer">Mở video bài học</a>}
              {safeHttps(lesson.duong_dan_anh) && <img className="learning-illustration" src={safeHttps(lesson.duong_dan_anh)} alt={`Minh họa: ${lesson.tieu_de}`} />}
              {lesson.noi_dung_van_ban ? <p className="learning-text">{lesson.noi_dung_van_ban}</p> : <p>Giáo viên chưa thêm nội dung văn bản cho bài học này.</p>}
              <button className="button button-primary" disabled={busy || lesson.trang_thai === "DA_HOAN_THANH"} onClick={() => void complete()}>{busy ? "Đang lưu..." : lesson.trang_thai === "DA_HOAN_THANH" ? "Đã hoàn thành bài học" : "Đánh dấu hoàn thành"}</button>
            </article>
            <LessonAssignments key={lesson.ma_bai_hoc} token={token} lessonId={lesson.ma_bai_hoc} onChanged={() => { void loadLearningCourse(token, courseId).then(setCourse).catch(e => setActionError(learningError(e))); }} />
            <nav className="learning-actions" aria-label="Chuyển bài">
              {currentIndex > 0 && <Link className="button button-outline" to={`/courses/${courseId}/learn/${lessons[currentIndex - 1].ma_bai_hoc}`}>← Bài trước</Link>}
              {currentIndex >= 0 && currentIndex < lessons.length - 1 && <Link className="button button-primary" to={`/courses/${courseId}/learn/${lessons[currentIndex + 1].ma_bai_hoc}`}>Bài tiếp theo →</Link>}
            </nav>
          </>}
        </> : <><section className="settings-card"><h2>Giới thiệu khóa học</h2><p className="learning-text">{course.mo_ta}</p></section>
          {course.chuong.length === 0 && <p>Khóa học chưa có nội dung bài học.</p>}
          {course.chuong.map(c => <section className="settings-card" key={c.ma_chuong}><h2>{c.tieu_de}</h2><ol className="learning-lessons">{c.bai_hoc.map(l => <li key={l.ma_bai_hoc}>{enrolled ? <Link to={`/courses/${courseId}/learn/${l.ma_bai_hoc}`}>{l.tieu_de}</Link> : <span>{l.tieu_de}</span>} <span>{l.trang_thai === "DA_HOAN_THANH" ? "✓ Đã học" : l.trang_thai === "DANG_HOC" ? "Đang học" : "Chưa học"}</span></li>)}</ol></section>)}
        </>}
      </>}
    </div></main>
  </div>;
}
