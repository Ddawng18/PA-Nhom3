import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { getCourseStatusLabel } from "../logic/courseEditor";
import { learningError } from "../lib/learningApi";
import { loadTeacherOverview, type TeacherOverview } from "../lib/teacherApi";
import "../styles/settings.css";
import "../styles/teacher-workspace.css";

function displayName(email: string | undefined, metadata: Record<string, unknown>) {
  const name = metadata.display_name;
  return typeof name === "string" && name.trim() ? name.trim() : email?.split("@")[0] || "Giáo viên LINEA";
}

export default function TeacherOverviewPage() {
  const { user, session } = useAuth();
  const token = session?.access_token;
  const [data, setData] = useState<TeacherOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    void loadTeacherOverview(token, controller.signal)
      .then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(err => { if (!controller.signal.aborted) setError(learningError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, attempt]);
  if (!user) return null;
  const name = displayName(user.email, user.user_metadata);
  return <div className="settings-shell">
    <Sidebar user={user} displayName={name} initials={name.slice(0, 2).toUpperCase()} />
    <main className="settings-main"><div className="settings-content">
      <header className="settings-page-heading">
        <div><p className="settings-eyebrow">KHÔNG GIAN GIẢNG DẠY</p><h1>Tổng quan giáo viên</h1><p>Theo dõi khóa học, bài chờ chấm và học viên của bạn.</p></div>
        <Link className="button button-primary" to="/teacher/courses/new">Tạo khóa học</Link>
      </header>
      {loading ? <p role="status">Đang tải tổng quan...</p>
        : error ? <section className="settings-card"><p className="settings-error" role="alert">{error}</p><button className="button button-outline" type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></section>
        : data && <>
          <section className="teacher-stat-grid" aria-label="Số liệu giảng dạy">
            {([["Khóa học", data.totals.courses, "/my-courses"], ["Đã đăng", data.totals.published, "/my-courses"], ["Bản nháp", data.totals.drafts, "/my-courses"],
              ["Chờ chấm", data.totals.pendingSubmissions, "/teacher/submissions"], ["Đã chấm", data.totals.gradedSubmissions, "/teacher/submissions?status=graded"],
              ["Học viên", data.totals.students, "/teacher/students"]] as const).map(([label, value, to]) =>
              <Link className="settings-card teacher-stat" to={to} key={label}><span>{label}</span><strong>{value}</strong></Link>)}
          </section>
          <section className="settings-card">
            <div className="teacher-section-heading"><h2>Bài chờ chấm gần đây</h2><Link to="/teacher/submissions">Xem hàng đợi</Link></div>
            {data.recentSubmissions.length === 0 ? <p>Chưa có bài nộp nào.</p>
              : <ul className="teacher-simple-list">{data.recentSubmissions.map(item =>
                <li key={item.id}><span>{item.studentName}</span><span>{item.status === "DA_CHAM" ? "Đã chấm" : "Chờ chấm"}</span><time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleString("vi-VN")}</time></li>)}</ul>}
          </section>
          <section className="settings-card">
            <div className="teacher-section-heading"><h2>Khóa học của tôi</h2><Link to="/my-courses">Quản lý khóa học</Link></div>
            {data.courses.length === 0 ? <p>Chưa có khóa học. <Link to="/teacher/courses/new">Tạo khóa đầu tiên</Link>.</p>
              : <ul className="teacher-course-overview">{data.courses.map(course =>
                <li key={course.id}><div><strong>{course.title}</strong><span>{getCourseStatusLabel(course.status)} · {course.pendingSubmissions} bài chờ chấm</span></div>
                  <div className="teacher-course-overview-actions"><Link to={`/teacher/submissions?courseId=${course.id}`}>Hàng đợi</Link><Link to={`/teacher/students?courseId=${course.id}`}>Học viên</Link></div></li>)}</ul>}
          </section>
        </>}
    </div></main>
  </div>;
}
