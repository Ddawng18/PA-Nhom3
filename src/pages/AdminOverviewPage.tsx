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
  return <div className="settings-shell workspace-overview">
    <Sidebar user={user} displayName={name} initials={name.slice(0, 2).toUpperCase()} />
    <main className="settings-main"><div className="settings-content">
      <section className="workspace-summary" aria-labelledby="admin-overview-title">
        <header className="workspace-summary-heading">
          <h1 id="admin-overview-title">Tổng quan quản trị</h1>
          <Link className="button button-outline" to="/admin/audit">Nhật ký kiểm toán</Link>
        </header>
        {!loading && !error && counts && (
          <div className="workspace-summary-grid" role="group" aria-label="Việc cần xử lý">
            {([
              ["Khóa học chờ duyệt", counts.pendingCourses, "/admin/manage?tab=review&muc=khoa-hoc"],
              ["Hồ sơ giáo viên chờ duyệt", counts.pendingTeachers, "/admin/manage?tab=review&muc=giao-vien"],
              ["Báo cáo chờ xử lý", counts.openReports, "/admin/community"],
            ] as const).map(([label, count, to]) => (
              <Link key={label} className="workspace-summary-item workspace-summary-metric" to={to}>
                <strong>{count}</strong> {label}
              </Link>
            ))}
          </div>
        )}
      </section>
      {loading ? <p role="status">Đang tải tổng quan...</p>
        : error ? <section className="settings-card"><p className="settings-error" role="alert">{error}</p><button className="button button-outline" type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></section>
        : counts && data && <>
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
          <section className="settings-card" aria-labelledby="admin-system-metrics">
            <div className="teacher-section-heading"><h2 id="admin-system-metrics">Số liệu hệ thống</h2></div>
            <dl className="workspace-metrics">
              {([
                ["Người dùng", counts.users], ["Giáo viên", counts.teachers],
                ["Khóa học", counts.courses], ["Khóa đang ẩn", counts.hiddenCourses],
                ["Bài cộng đồng", counts.posts], ["Bài bị ẩn", counts.hiddenPosts],
                ["Đơn hàng demo", counts.orders],
                ["Doanh thu demo", `${new Intl.NumberFormat("vi-VN").format(counts.revenueVnd)} ₫`],
              ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
          </section>
        </>}
    </div></main>
  </div>;
}
