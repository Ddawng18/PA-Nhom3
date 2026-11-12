import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { AssignmentCard } from "../components/LessonAssignments";
import { loadAssignments, loadMyCourses, learningError, type LearnerAssignment, type MyCourse } from "../lib/learningApi";
import "../styles/settings.css";
import "../styles/learning.css";

export default function StudentLearningOverviewPage({ mode }: { mode: "progress" | "assignments" }) {
  const { user, session } = useAuth(); const token = session?.access_token;
  const [courses, setCourses] = useState<MyCourse[]>([]); const [assignments, setAssignments] = useState<LearnerAssignment[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController(); setLoading(true); setError("");
    void Promise.all([loadMyCourses(token, controller.signal), loadAssignments(token, undefined, controller.signal)])
      .then(([mine, work]) => { if (!controller.signal.aborted) { setCourses(mine); setAssignments(work); } })
      .catch(e => { if (!controller.signal.aborted) setError(learningError(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, attempt]);
  if (!user || !token) return null;
  const visible = assignments.filter(a => filter === "all" || (filter === "graded" ? a.submission?.grade : filter === "waiting" ? a.submission && !a.submission.grade : !a.submission));
  return <div className="settings-shell"><Sidebar user={user} displayName={user.email ?? "Học viên"} initials="HV" />
    <main className="settings-main"><div className="settings-content learning-content"><h1>{mode === "progress" ? "Tiến độ học tập" : "Bài luyện tập"}</h1>
      <button className="button button-outline" onClick={() => setAttempt(v => v + 1)}>Tải lại</button>
      {loading ? <p role="status">Đang tải...</p> : error ? <p role="alert" className="settings-error">{error}</p> : mode === "progress" ? <>
        <p>Đã hoàn thành {courses.filter(c => c.status === "HOAN_THANH").length}/{courses.length} khóa · Đã chấm {assignments.filter(a => a.submission?.grade).length}/{assignments.length} bài tập.</p>
        {courses.length === 0 && <Link to="/my-courses">Khám phá khóa học để bắt đầu</Link>}
        {courses.map(c => <section className="settings-card" key={c.id}><h2>{c.title}</h2><label>Tiến độ bài học: {c.percent}%<progress value={c.percent} max={100} /></label>
          <p>{c.status === "HOAN_THANH" ? "Đã hoàn thành khóa học" : "Đang học"} · Bài tập đã chấm: {assignments.filter(a => a.courseId === c.id && a.submission?.grade).length}/{assignments.filter(a => a.courseId === c.id).length}</p>
          {c.available ? <Link className="button button-primary" to={`/courses/${c.id}`}>Xem khóa học</Link> : <p>Khóa học đang tạm ẩn.</p>}</section>)}
      </> : <>
        <nav className="settings-tabs" aria-label="Lọc bài tập">{[["all", "Tất cả"], ["new", "Chưa nộp"], ["waiting", "Chờ chấm"], ["graded", "Đã chấm"]].map(([id, label]) => <button key={id} type="button" className={`settings-tab${filter === id ? " active" : ""}`} onClick={() => setFilter(id)}>{label}</button>)}</nav>
        {visible.length === 0 && <p>Chưa có bài tập trong mục này.</p>}
        {visible.map(a => <section key={a.id}><Link to={`/courses/${a.courseId}/learn/${a.lessonId}`}>{courses.find(c => c.id === a.courseId)?.title} · {a.lessonTitle}</Link>
          <AssignmentCard assignment={a} token={token} onSaved={() => setAttempt(v => v + 1)} /></section>)}
      </>}
    </div></main>
  </div>;
}
