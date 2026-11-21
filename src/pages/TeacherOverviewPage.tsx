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
  return <div className="settings-shell workspace-overview">
    <Sidebar user={user} displayName={name} initials={name.slice(0, 2).toUpperCase()} />
    <main className="settings-main"><div className="settings-content">
      <section className="workspace-summary" aria-labelledby="teacher-overview-title">
        <header className="workspace-summary-heading">
          <h1 id="teacher-overview-title">Tổng quan giáo viên</h1>
          <Link className="button button-outline" to="/teacher/courses/new">Tạo khóa học</Link>
        </header>
        {!loading && !error && data && (
          <div className="workspace-summary-grid" role="group" aria-label="Số liệu giảng dạy">
            <div className="workspace-summary-item">
              <Link className="workspace-summary-metric" to="/my-courses"><strong>{data.totals.courses}</strong> Khóa học</Link>
              <p>{data.totals.published} đã đăng · {data.totals.drafts} bản nháp</p>
            </div>
            <div className="workspace-summary-item">
              <Link className="workspace-summary-metric" to="/teacher/submissions"><strong>{data.totals.pendingSubmissions}</strong> Bài chờ chấm</Link>
              <Link className="workspace-summary-detail" to="/teacher/submissions?status=graded">{data.totals.gradedSubmissions} bài đã chấm</Link>
            </div>
            <div className="workspace-summary-item">
              <Link className="workspace-summary-metric" to="/teacher/students"><strong>{data.totals.students}</strong> Học viên</Link>
            </div>
          </div>
        )}
      </section>
      {loading ? <p role="status">Đang tải tổng quan...</p>
        : error ? <section className="settings-card"><p className="settings-error" role="alert">{error}</p><button className="button button-outline" type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></section>
        : data && <>
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
