import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Award, CheckCircle2 } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { loadLearningCourse, learningError, type LearningCourse } from "../lib/learningApi";
import "../styles/settings.css";
import "../styles/course-complete.css";

function chapterStats(chapter: LearningCourse["chuong"][number]) {
  const total = chapter.bai_hoc.length;
  const done = chapter.bai_hoc.filter(l => l.trang_thai === "DA_HOAN_THANH").length;
  return { total, done };
}

export default function CourseCompletePage() {
  const { user, session } = useAuth();
  const token = session?.access_token;
  const { courseId = "" } = useParams();
  const [course, setCourse] = useState<LearningCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController(); setLoading(true); setCourse(null); setError("");
    void loadLearningCourse(token, courseId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setCourse(data); })
      .catch(e => { if (!controller.signal.aborted) setError(learningError(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, courseId, attempt]);
  if (!user || !token) return null;
  const metadataName = user.user_metadata.display_name;
  const displayName = typeof metadataName === "string" && metadataName.trim() ? metadataName.trim() : "";
  const completed = Boolean(course?.trang_thai_ghi_danh === "HOAN_THANH" && course?.da_ghi_danh);
  if (!loading && !error && course && !completed) return <Navigate to={`/courses/${courseId}/learn`} replace />;
  const lessons = course?.chuong.flatMap(c => c.bai_hoc) ?? [];
  const completedLessons = lessons.filter(l => l.trang_thai === "DA_HOAN_THANH").length;
  const percent = course ? Math.min(100, Math.max(0, course.phan_tram)) : 0;
  return <div className="settings-shell"><Sidebar user={user} displayName={displayName || user.email || "Học viên"} initials={(displayName || user.email || "HV").slice(0, 2).toUpperCase()} />
    <main className="settings-main"><div className="settings-content complete-content">
      <header className="settings-page-heading complete-heading">
        <div>
          <p className="settings-eyebrow">CHẶNG ĐƯỜNG HOÀN THÀNH</p>
          <h1>Bạn đã đi hết một chặng đường!</h1>
          <p>{displayName ? `Chúc mừng ${displayName} đã hoàn thành trọn vẹn khóa học này.` : "Chúc mừng bạn đã hoàn thành trọn vẹn khóa học này."}</p>
        </div>
      </header>
      {loading ? <p className="complete-status" role="status">Đang tải khóa học...</p>
        : error ? <section className="complete-card complete-error">
          <p role="alert">{error}</p>
          <button className="button button-outline" onClick={() => setAttempt(v => v + 1)}>Thử lại</button>
        </section>
        : course && <>
          <section className="complete-banner" aria-label="Khóa học đã hoàn thành">
            <span className="complete-banner-icon"><Award aria-hidden="true" size={26} /></span>
            <p className="complete-banner-label">ĐÃ HOÀN THÀNH KHÓA HỌC</p>
            <h2>{course.tieu_de}</h2>
            <p className="complete-banner-meta">{completedLessons}/{lessons.length} bài học · {course.chuong.length} chương</p>
            {course.mo_ta.trim() && <p className="complete-banner-desc">{course.mo_ta}</p>}
          </section>
          <div className="complete-columns">
            <section className="complete-card" aria-labelledby="complete-chapters-heading">
              <h2 id="complete-chapters-heading">Nền tảng bạn đã xây</h2>
              {course.chuong.length === 0
                ? <p className="complete-muted">Khóa học chưa có chương nào.</p>
                : <ul className="complete-chapters">
                  {course.chuong.map(chapterItem => {
                    const stats = chapterStats(chapterItem);
                    return <li className="complete-chapter" key={chapterItem.ma_chuong}>
                      <CheckCircle2 aria-hidden="true" size={16} />
                      <strong>{chapterItem.tieu_de}</strong>
                      <span>{stats.done}/{stats.total} bài</span>
                    </li>;
                  })}
                </ul>}
            </section>
            <aside className="complete-card complete-summary" aria-labelledby="complete-progress-heading">
              <h2 id="complete-progress-heading">Tiến độ khóa học</h2>
              <p>{completedLessons}/{lessons.length} bài · {percent}%</p>
              <div className="course-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Tiến độ khóa học">
                <span style={{ width: `${percent}%` }} />
              </div>
              <div className="complete-actions">
                <Link className="button button-primary" to={`/courses/${courseId}/learn`}>Xem lại khóa học</Link>
              </div>
            </aside>
          </div>
        </>}
    </div></main>
  </div>;
}
