import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { learningError } from "../lib/learningApi";
import { loadAdminOverview, type AdminOverview } from "../lib/adminWorkspaceApi";
import "../styles/settings.css";
import "../styles/teacher-workspace.css";

function displayName(email: string | undefined, metadata: Record<string, unknown>) {
  const name = metadata.display_name;
  return typeof name === "string" && name.trim() ? name.trim() : email?.split("@")[0] || "Quản trị viên";
}

export default function AdminOverviewPage() {
  const { user, session } = useAuth();
  const token = session?.access_token;
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    void loadAdminOverview(token, controller.signal)
      .then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(err => { if (!controller.signal.aborted) setError(learningError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, attempt]);
  if (!user) return null;
  const name = displayName(user.email, user.user_metadata);
  const counts = data?.counts;
  return <div className="settings-shell">
    <Sidebar user={user} displayName={name} initials={name.slice(0, 2).toUpperCase()} />
    <main className="settings-main"><div className="settings-content">
      <header className="settings-page-heading">
        <div><p className="settings-eyebrow">QUẢN TRỊ HỆ THỐNG</p><h1>Tổng quan quản trị</h1><p>Theo dõi người dùng, khóa học, cộng đồng và nhật ký kiểm toán.</p></div>
        <Link className="button button-outline" to="/admin/audit">Nhật ký kiểm toán</Link>
      </header>
      {loading ? <p role="status">Đang tải tổng quan...</p>
        : error ? <section className="settings-card"><p className="settings-error" role="alert">{error}</p><button className="button button-outline" type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></section>
        : counts && data && <>
          <section className="teacher-stat-grid" aria-label="Số liệu hệ thống">
            {([["Người dùng", counts.users, "/admin/manage"], ["Giáo viên", counts.teachers, "/admin/manage"],
              ["Chờ duyệt giáo viên", counts.pendingTeachers, "/admin/manage"], ["Khóa học", counts.courses, "/admin/manage"],
              ["Chờ duyệt khóa học", counts.pendingCourses, "/admin/manage"], ["Khóa đang ẩn", counts.hiddenCourses, "/admin/manage"],
              ["Bài cộng đồng", counts.posts, "/community"], ["Bài bị ẩn", counts.hiddenPosts, "/admin/community"],
              ["Báo cáo chờ xử lý", counts.openReports, "/admin/community"], ["Đơn hàng demo", counts.orders, "/admin"],
              ["Doanh thu demo (₫)", counts.revenueVnd, "/admin"]] as const).map(([label, value, to]) =>
              <Link className={`settings-card teacher-stat${label === "Báo cáo chờ xử lý" && value > 0 ? " needs-attention" : ""}`} to={to} key={label}>
                <span>{label}</span><strong>{label.startsWith("Doanh thu") ? new Intl.NumberFormat("vi-VN").format(value) : value}</strong>
              </Link>)}
          </section>
          <section className="settings-card">
            <div className="teacher-section-heading"><h2>Báo cáo cộng đồng mới</h2><Link to="/admin/community">Mở hàng đợi kiểm duyệt</Link></div>
            {data.reports.length === 0 ? <p>Không có báo cáo đang chờ.</p>
              : <ul className="teacher-simple-list">{data.reports.map(report =>
                <li key={report.id}><span>Bài #{report.postId}</span><span>{report.reason}</span><time dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString("vi-VN")}</time></li>)}</ul>}
          </section>
          <section className="settings-card">
            <div className="teacher-section-heading"><h2>Hoạt động quản trị gần đây</h2><Link to="/admin/audit">Xem tất cả</Link></div>
            {data.audit.length === 0 ? <p>Chưa có hoạt động.</p>
              : <ul className="teacher-simple-list">{data.audit.map(entry =>
                <li key={entry.id}><span>{entry.actor} · {entry.objectType} #{entry.objectId}</span><span>{entry.previousStatus ? `${entry.previousStatus} → ` : ""}{entry.status}</span><time dateTime={entry.occurredAt}>{new Date(entry.occurredAt).toLocaleString("vi-VN")}</time></li>)}</ul>}
          </section>
        </>}
    </div></main>
  </div>;
}
