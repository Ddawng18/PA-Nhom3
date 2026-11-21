import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { learningError } from "../lib/learningApi";
import { loadTeacherOverview, loadTeacherStudents, type TeacherOverview } from "../lib/teacherApi";
import "../styles/settings.css";
import "../styles/teacher-workspace.css";

type StudentRows = Awaited<ReturnType<typeof loadTeacherStudents>>;

function displayName(email: string | undefined, metadata: Record<string, unknown>) {
  const name = metadata.display_name;
  return typeof name === "string" && name.trim() ? name.trim() : email?.split("@")[0] || "Giáo viên LINEA";
}

export default function TeacherStudentsPage() {
  const { user, session } = useAuth();
  const token = session?.access_token;
  const [params, setParams] = useSearchParams();
  const courseId = params.get("courseId") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const [data, setData] = useState<StudentRows | null>(null);
  const [overview, setOverview] = useState<TeacherOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    void Promise.all([
      loadTeacherStudents(token, { courseId: courseId || undefined, page }, controller.signal),
      loadTeacherOverview(token, controller.signal),
    ]).then(([rows, nextOverview]) => {
      if (!controller.signal.aborted) { setData(rows); setOverview(nextOverview); }
    }).catch(err => { if (!controller.signal.aborted) setError(learningError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, courseId, page, attempt]);
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
        <div><p className="settings-eyebrow">HỌC VIÊN</p><h1>Học viên theo khóa học</h1><p>Chỉ hiển thị học viên đã ghi danh khóa học bạn sở hữu.</p></div>
        <Link className="button button-outline" to="/teacher">Về tổng quan</Link>
      </header>
      <div className="teacher-queue-filters">
        <label>Khóa học <select value={courseId} onChange={event => update({ courseId: event.target.value, page: "" })}>
          <option value="">Tất cả khóa học</option>
          {overview?.courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
        </select></label>
        <button className="button button-outline" type="button" onClick={() => setAttempt(value => value + 1)}>Tải lại</button>
      </div>
      {loading ? <p role="status">Đang tải học viên...</p>
        : error ? <section className="settings-card"><p className="settings-error" role="alert">{error}</p><button className="button button-outline" type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></section>
        : !data || data.items.length === 0 ? <section className="settings-card"><p>Chưa có học viên trong mục này.</p></section>
        : <>
          <p className="teacher-queue-count" role="status">{data.total} lượt ghi danh</p>
          <div className="teacher-table-wrap"><table className="teacher-table">
            <caption className="sr-only">Danh sách học viên theo khóa học</caption>
            <thead><tr><th scope="col">Học viên</th><th scope="col">Khóa học</th><th scope="col">Trạng thái</th><th scope="col">Ghi danh</th><th scope="col">Hoàn thành</th></tr></thead>
            <tbody>{data.items.map((item, index) => <tr key={`${item.studentId}-${item.courseId}-${index}`}>
              <th scope="row">{item.studentName}</th>
              <td><Link to={`/teacher/submissions?courseId=${item.courseId}`}>{item.courseTitle}</Link></td>
              <td>{item.status === "HOAN_THANH" ? "Hoàn thành" : item.status === "DANG_HOC" ? "Đang học" : "Đã hủy"}</td>
              <td>{new Date(item.enrolledAt).toLocaleDateString("vi-VN")}</td>
              <td>{item.completedAt ? new Date(item.completedAt).toLocaleDateString("vi-VN") : "—"}</td>
            </tr>)}</tbody>
          </table></div>
          <nav className="teacher-pagination" aria-label="Phân trang học viên">
            <button className="button button-outline" type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Trước</button>
            <span>Trang {page}</span>
            <button className="button button-outline" type="button" disabled={page * 50 >= data.total} onClick={() => update({ page: String(page + 1) })}>Sau</button>
          </nav>
        </>}
    </div></main>
  </div>;
}
