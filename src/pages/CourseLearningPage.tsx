import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, ChevronDown, Circle, PlayCircle } from "lucide-react";
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

function chapterStats(chapter: LearningCourse["chuong"][number]) {
  const total = chapter.bai_hoc.length;
  const done = chapter.bai_hoc.filter(l => l.trang_thai === "DA_HOAN_THANH").length;
  return { total, done, percent: total ? Math.round((done * 100) / total) : 0 };
}

type ChapterLesson = LearningCourse["chuong"][number]["bai_hoc"][number];

function LessonStatusIcon({ status }: { status: string }) {
  const state = status === "DA_HOAN_THANH" ? "done" : status === "DANG_HOC" ? "current" : "idle";
  const Icon = state === "done" ? CheckCircle2 : state === "current" ? PlayCircle : Circle;
  return <Icon className={`lesson-status-icon is-${state}`} size={16} aria-hidden="true" />;
}

function ChapterLessonRow({ courseId, lesson, active, enrolled }: { courseId: string; lesson: ChapterLesson; active: boolean; enrolled: boolean }) {
  const className = `lesson-player-lesson${active ? " is-active" : ""}`;
  const content = <><LessonStatusIcon status={lesson.trang_thai} /><span>{lesson.tieu_de}</span></>;
  return enrolled
    ? <Link className={className} to={`/courses/${courseId}/learn/${lesson.ma_bai_hoc}`}>{content}</Link>
    : <span className={className}>{content}</span>;
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
  const [openChapter, setOpenChapter] = useState<number | null>(null);
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
  const videoLink = safeHttps(lesson?.lien_ket_video ?? null);
  const illustration = safeHttps(lesson?.duong_dan_anh ?? null);
  const level = course ? getCourseLevelLabel(course.cap_do) : "";
  const topic = course?.chu_de.trim() ?? "";
  const enrollmentLabel = course?.trang_thai_ghi_danh === "HOAN_THANH" ? "Hoàn thành" : course?.trang_thai_ghi_danh ? "Đang học" : "";
  const completedLessons = lessons.filter(l => l.trang_thai === "DA_HOAN_THANH").length;
  const activeLessonNumber = lessonId ? Number(lessonId) : resume?.ma_bai_hoc;
  const currentChapterIndex = course ? course.chuong.findIndex(c => c.bai_hoc.some(l => l.ma_bai_hoc === activeLessonNumber)) : -1;
  const currentChapter = course && currentChapterIndex >= 0 ? course.chuong[currentChapterIndex] : undefined;
  const currentChapterProgress = currentChapter ? chapterStats(currentChapter) : null;
  const progressLabel = currentChapterProgress ? `${currentChapterProgress.done}/${currentChapterProgress.total} bài · ${currentChapterProgress.percent}%` : "";
  const lessonAttemptLabel = lessonId ? (lesson?.trang_thai === "DA_HOAN_THANH" ? "Đã hoàn thành bài học" : "Hoàn thành bài học") : "";
  const openChapterIndex = openChapter ?? currentChapterIndex;
  const hasPlayable = Boolean(video || videoLink || illustration);
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
      <Link className="lesson-player-back" to={lessonId ? `/courses/${courseId}/learn` : "/my-courses"}>← {lessonId ? "Nội dung khóa học" : "Khóa học của tôi"}</Link>
      {loading ? <p className="lesson-player-status" role="status">Đang tải khóa học...</p> : error ? <section className="lesson-player-card"><p role="alert">{error}</p><button className="button button-outline" onClick={() => setAttempt(v => v + 1)}>Thử lại</button></section> : course && (lessonId ? <>
        <header className="settings-page-heading lesson-player-heading">
          <div>
            <p className="settings-eyebrow">{course.tieu_de}</p>
            <h1>{lesson?.tieu_de ?? course.tieu_de}</h1>
            {currentIndex >= 0 && <p className="lesson-player-subtitle">Bài {currentIndex + 1}{currentChapter ? ` · ${currentChapter.tieu_de}` : ""}</p>}
          </div>
        </header>
        {actionError && <p className="settings-error" role="alert">{actionError}</p>}
        {!enrolled ? <section className="lesson-player-card lesson-player-enroll">
          <p>Ghi danh để học và nộp bài tập.</p>
          <button className="button button-primary" disabled={busy} onClick={() => void enroll()}>{busy ? "Đang ghi danh..." : "Ghi danh khóa học"}</button>
        </section> : lessonError ? <section className="lesson-player-card">
          <p role="alert">{lessonError}</p>
          <button className="button button-outline" onClick={() => setLessonAttempt(v => v + 1)}>Thử lại</button>
        </section> : <div className="lesson-detail-layout">
          <div className="lesson-detail-main">
            {(lessonLoading || !lesson || hasPlayable || !lesson.noi_dung_van_ban) && <section className="lesson-player-stage" aria-label="Nội dung bài học">
              {lessonLoading ? <p className="lesson-player-stage-empty" role="status">Đang tải bài học...</p>
                : lesson ? video
                  ? <iframe className="lesson-player-video" src={video} title={lesson.tieu_de} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                  : videoLink ? <a className="button button-outline lesson-player-video-link" href={videoLink} target="_blank" rel="noreferrer">Mở video bài học</a>
                    : illustration ? <img className="lesson-player-illustration" src={illustration} alt={`Minh họa: ${lesson.tieu_de}`} />
                      : <div className="lesson-player-stage-empty"><p>Bài học này chưa có nội dung để hiển thị.</p></div>
                : null}
            </section>}
            {lesson && illustration && (video || videoLink) && <img className="lesson-player-illustration lesson-detail-figure" src={illustration} alt={`Minh họa: ${lesson.tieu_de}`} />}
            {lesson?.noi_dung_van_ban && <section className="lesson-player-card lesson-detail-content">
              <p className="learning-text">{lesson.noi_dung_van_ban}</p>
            </section>}
            {lesson && <nav className="lesson-player-actions" aria-label="Hành động bài học">
              {currentIndex > 0 && <Link className="button button-outline" to={`/courses/${courseId}/learn/${lessons[currentIndex - 1].ma_bai_hoc}`}>← Bài trước</Link>}
              {lessonAttemptLabel && <button className="button button-primary" disabled={busy || lesson.trang_thai === "DA_HOAN_THANH"} onClick={() => void complete()}>{busy ? "Đang lưu..." : lessonAttemptLabel}</button>}
              {currentIndex >= 0 && currentIndex < lessons.length - 1 && <Link className="button button-outline" to={`/courses/${courseId}/learn/${lessons[currentIndex + 1].ma_bai_hoc}`}>Bài tiếp theo →</Link>}
            </nav>}
            {lesson && <LessonAssignments key={lesson.ma_bai_hoc} token={token} lessonId={lesson.ma_bai_hoc} onChanged={() => { void loadLearningCourse(token, courseId).then(setCourse).catch(e => setActionError(learningError(e))); }} />}
          </div>
          <aside className="lesson-player-card lesson-detail-side" aria-labelledby="lesson-chapter-heading">
            {currentChapter ? <>
              <div className="lesson-player-card-heading">
                <h2 id="lesson-chapter-heading">{currentChapter.tieu_de}</h2>
                <span className="lesson-player-card-count">{currentChapter.bai_hoc.length} bài</span>
              </div>
              <ol className="lesson-player-lesson-list">
                {currentChapter.bai_hoc.map(item => <li key={item.ma_bai_hoc}>
                  <ChapterLessonRow courseId={courseId} lesson={item} active={String(item.ma_bai_hoc) === lessonId} enrolled={enrolled} />
                </li>)}
              </ol>
              {currentChapterProgress && <>
                <p className="lesson-player-progress-label">{progressLabel}</p>
                <div className="course-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={currentChapterProgress.percent} aria-label="Tiến độ chương">
                  <span style={{ width: `${currentChapterProgress.percent}%` }} />
                </div>
              </>}
            </> : <p className="lesson-player-muted">Chưa có bài học để hiển thị.</p>}
          </aside>
        </div>}
      </> : <>
        <header className="settings-page-heading lesson-player-heading">
          <div>
            {(level || topic) && <p className="settings-eyebrow">{[level, topic].filter(Boolean).join(" · ").toUpperCase()}</p>}
            <h1>{course.tieu_de}</h1>
          </div>
        </header>
        {(enrollmentLabel || level || topic || lessons.length > 0 || course.chuong.length > 0) && <div className="lesson-player-badges">
          {enrollmentLabel && <span className="lesson-badge is-status">{enrollmentLabel}</span>}
          {level && <span className="lesson-badge">{level}</span>}
          {topic && <span className="lesson-badge">{topic}</span>}
          {lessons.length > 0 && <span className="lesson-badge">{lessons.length} bài học</span>}
          {course.chuong.length > 0 && <span className="lesson-badge">{course.chuong.length} chương</span>}
        </div>}
        {actionError && <p className="settings-error" role="alert">{actionError}</p>}
        {!enrolled && <section className="lesson-player-card lesson-player-enroll">
          <p>Ghi danh để học và nộp bài tập.</p>
          <button className="button button-primary" disabled={busy} onClick={() => void enroll()}>{busy ? "Đang ghi danh..." : "Ghi danh khóa học"}</button>
        </section>}
        <div className="lesson-player-columns">
          <section className="lesson-player-card" aria-labelledby="lesson-roadmap-heading">
            <div className="lesson-player-card-heading">
              <h2 id="lesson-roadmap-heading">Lộ trình trong khóa</h2>
              {course.chuong.length > 0 && <span className="lesson-player-card-count">{course.chuong.length} chương</span>}
            </div>
            {course.chuong.length === 0
              ? <p className="lesson-player-muted">Khóa học chưa có nội dung bài học.</p>
              : <ol className="lesson-roadmap">
                {course.chuong.map((chapterItem, index) => {
                  const stats = chapterStats(chapterItem);
                  const active = index === currentChapterIndex;
                  const open = openChapterIndex === index;
                  return <li className="lesson-roadmap-chapter" key={chapterItem.ma_chuong}>
                    <button type="button" className={`lesson-roadmap-row${active ? " is-active" : ""}`} aria-expanded={open} onClick={() => setOpenChapter(open ? -1 : index)}>
                      <span className="lesson-roadmap-index">{index + 1}</span>
                      <span className="lesson-roadmap-body">
                        <strong>{chapterItem.tieu_de}</strong>
                        <small>{chapterItem.bai_hoc.length} bài</small>
                      </span>
                      <span className="lesson-roadmap-progress">{stats.done}/{stats.total}</span>
                      <ChevronDown className={`lesson-roadmap-chevron${open ? " is-open" : ""}`} size={16} aria-hidden="true" />
                    </button>
                    {open && <ul className="lesson-roadmap-lessons">
                      {chapterItem.bai_hoc.map(item => <li key={item.ma_bai_hoc}>
                        <ChapterLessonRow courseId={courseId} lesson={item} active={false} enrolled={enrolled} />
                      </li>)}
                    </ul>}
                  </li>;
                })}
              </ol>}
          </section>
          <section className="lesson-player-card" aria-labelledby="lesson-current-heading">
            <div className="lesson-player-card-heading">
              <h2 id="lesson-current-heading">Bài học hiện tại</h2>
            </div>
            {currentChapter ? <>
              <p className="lesson-player-chapter">{currentChapter.tieu_de}</p>
              <ol className="lesson-player-lesson-list">
                {currentChapter.bai_hoc.map(item => <li key={item.ma_bai_hoc}>
                  <ChapterLessonRow courseId={courseId} lesson={item} active={false} enrolled={enrolled} />
                </li>)}
              </ol>
              {currentChapterProgress && <>
                <p className="lesson-player-progress-label">{progressLabel}</p>
                <div className="course-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={currentChapterProgress.percent} aria-label="Tiến độ chương">
                  <span style={{ width: `${currentChapterProgress.percent}%` }} />
                </div>
              </>}
              {lessons.length > 0 && <>
                <p className="lesson-player-progress-label">Bài học · {completedLessons}/{lessons.length} bài · {course.phan_tram}%</p>
                <div className="course-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={course.phan_tram} aria-label="Tiến độ bài học">
                  <span style={{ width: `${Math.min(100, Math.max(0, course.phan_tram))}%` }} />
                </div>
              </>}
              <p className="lesson-player-note">{course.trang_thai_ghi_danh === "HOAN_THANH" ? "Bạn đã hoàn thành khóa học. Bạn có thể xem lại toàn bộ bài học." : "Hoàn thành các bài học bắt buộc và nộp đủ bài tập bắt buộc để hoàn thành khóa."}</p>
              {enrolled && resume && <Link className="button button-primary lesson-complete-button" to={`/courses/${courseId}/learn/${resume.ma_bai_hoc}`}>{course.trang_thai_ghi_danh === "HOAN_THANH" ? "Xem lại bài học" : "Tiếp tục học"}</Link>}
              {course.trang_thai_ghi_danh === "HOAN_THANH" && <Link className="button button-primary lesson-complete-button" to={`/courses/${courseId}/complete`}>Hoàn thành khóa học</Link>}
            </> : <p className="lesson-player-muted">Chưa có bài học để hiển thị.</p>}
          </section>
        </div>
        {course.mo_ta.trim() && <section className="lesson-player-card lesson-player-intro">
          <h2>Giới thiệu khóa học</h2>
          <p className="learning-text">{course.mo_ta}</p>
        </section>}
      </>)}
    </div></main>
  </div>;
}
