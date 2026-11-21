import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { learningError } from "../lib/learningApi";
import { loadTeacherOverview, loadTeacherSubmissions, type TeacherOverview, type TeacherSubmissionQueue } from "../lib/teacherApi";
import "../styles/settings.css";
import "../styles/teacher-workspace.css";

function displayName(email: string | undefined, metadata: Record<string, unknown>) {
  const name = metadata.display_name;
  return typeof name === "string" && name.trim() ? name.trim() : email?.split("@")[0] || "Giáo viên LINEA";
}

export default function TeacherSubmissionsQueuePage() {
  const { user, session } = useAuth();
  const token = session?.access_token;
  const [params, setParams] = useSearchParams();
  const status = params.get("status") === "graded" ? "graded" : params.get("status") === "all" ? "all" : "waiting";
  const courseId = params.get("courseId") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const [queue, setQueue] = useState<TeacherSubmissionQueue | null>(null);
  const [overview, setOverview] = useState<TeacherOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    void Promise.all([
      loadTeacherSubmissions(token, { status, courseId: courseId || undefined, page }, controller.signal),
      loadTeacherOverview(token, controller.signal),
    ]).then(([nextQueue, nextOverview]) => {
      if (!controller.signal.aborted) { setQueue(nextQueue); setOverview(nextOverview); }
    }).catch(err => { if (!controller.signal.aborted) setError(learningError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, status, courseId, page, attempt]);
  if (!user) return null;
  const name = displayName(user.email, user.user_metadata);
  function update(next: Record<string, string>) {
    const values = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) values.set(key, value); else values.delete(key);
    }
    setParams(values, { replace: true });
  }
  return <div className="settings-shell">
    <Sidebar user={user} displayName={name} initials={name.slice(0, 2).toUpperCase()} />
    <main className="settings-main"><div className="settings-content">
      <header className="settings-page-heading">
        <div><p className="settings-eyebrow">CHẤM BÀI</p><h1>Bài nộp của học viên</h1><p>Bài nộp từ tất cả khóa học bạn sở hữu.</p></div>
        <Link className="button button-outline" to="/teacher">Về tổng quan</Link>
      </header>
      <div className="teacher-queue-filters">
        <label>Trạng thái <select value={status} onChange={event => update({ status: event.target.value, page: "" })}>
          <option value="waiting">Chờ chấm</option><option value="graded">Đã chấm</option><option value="all">Tất cả</option>
        </select></label>
        <label>Khóa học <select value={courseId} onChange={event => update({ courseId: event.target.value, page: "" })}>
          <option value="">Tất cả khóa học</option>
          {overview?.courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
        </select></label>
        <button className="button button-outline" type="button" onClick={() => setAttempt(value => value + 1)}>Tải lại</button>
      </div>
      {loading ? <p role="status">Đang tải bài nộp...</p>
        : error ? <section className="settings-card"><p className="settings-error" role="alert">{error}</p><button className="button button-outline" type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></section>
        : !queue || queue.items.length === 0 ? <section className="settings-card"><p>Không có bài nộp trong mục này.</p></section>
        : <>
          <p className="teacher-queue-count" role="status">{queue.total} bài nộp</p>
          <section className="teacher-queue-list" aria-label="Danh sách bài nộp">
            {queue.items.map(item => <article className="settings-card teacher-queue-item" key={item.id}>
              <div className="teacher-queue-main">
                <h2>{item.lessonTitle}</h2>
                <p>{item.studentName} · {item.courseTitle}</p>
                <p className="teacher-queue-prompt">{item.prompt}</p>
                <p className="teacher-queue-meta">Cập nhật {new Date(item.updatedAt).toLocaleString("vi-VN")}{item.grade ? ` · Điểm ${item.grade.score}/10` : ""}</p>
              </div>
              <div className="teacher-queue-actions">
                <span className={`teacher-course-status status-${item.status}`}>{item.status === "DA_CHAM" ? "Đã chấm" : "Chờ chấm"}</span>
                <Link className="button button-primary" to={`/teacher/courses/${item.courseId}/submissions`}>{item.status === "DA_CHAM" ? "Xem / chấm lại" : "Chấm bài"}</Link>
              </div>
            </article>)}
          </section>
          <nav className="teacher-pagination" aria-label="Phân trang bài nộp">
            <button className="button button-outline" type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Trước</button>
            <span>Trang {page}</span>
            <button className="button button-outline" type="button" disabled={page * 20 >= queue.total} onClick={() => update({ page: String(page + 1) })}>Sau</button>
          </nav>
        </>}
    </div></main>
  </div>;
}
