import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import PublicHeader from "../components/PublicHeader";
import {
  loadCommunityReports,
  resolveCommunityReport,
  setCommunityPostStatus,
  type CommunityReport,
} from "../lib/communityModerationApi";
import "../styles/course-detail.css";
import "../styles/admin-management.css";

function ReportCard({ report, token, onResolved }: { report: CommunityReport; token: string; onResolved: (id: number, postStatus: string) => void }) {
  const [note, setNote] = useState(report.note ?? "");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function resolve(action: "HIDE" | "KEEP") {
    setBusy(true); setError("");
    try {
      const result = await resolveCommunityReport(token, report.id, action, note);
      onResolved(report.id, result.postStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa xử lý được báo cáo. Vui lòng thử lại.");
    } finally { setBusy(false); }
  }
  async function togglePost() {
    setBusy(true); setError("");
    try {
      const next = report.postStatus === "HIDDEN" ? "VISIBLE" : "HIDDEN";
      const result = await setCommunityPostStatus(token, report.postId, next);
      onResolved(report.id, result.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa đổi được trạng thái bài viết.");
    } finally { setBusy(false); }
  }
  return <article className="admin-report-card">
    <header>
      <div>
        <h2>{report.postTitle}</h2>
        <p className="admin-manage-meta">Tác giả: {report.author} · Người báo cáo: {report.reporter}</p>
        <p className="admin-manage-meta">{new Date(report.createdAt).toLocaleString("vi-VN")}</p>
      </div>
      <span className={`admin-manage-badge${report.status === "OPEN" ? "" : " is-muted"}`}>
        {report.status === "OPEN" ? "Chờ xử lý" : report.status === "RESOLVED" ? "Đã ẩn bài" : "Bỏ qua"}
      </span>
    </header>
    <p className="admin-report-reason"><strong>Lý do:</strong> {report.reason}</p>
    <details open={open} onToggle={event => setOpen((event.currentTarget as HTMLDetailsElement).open)}>
      <summary>Xem nội dung bài viết</summary>
      <p className="admin-report-body">{report.postBody}</p>
    </details>
    {report.status === "OPEN" ? <>
      <label htmlFor={`note-${report.id}`}>Ghi chú kiểm duyệt (không bắt buộc)</label>
      <textarea id={`note-${report.id}`} maxLength={1000} rows={2} disabled={busy} value={note} onChange={event => setNote(event.target.value)} />
      <div className="admin-report-actions">
        <button type="button" className="admin-manage-action" disabled={busy} onClick={() => void resolve("HIDE")}>{busy ? "Đang xử lý..." : "Ẩn bài viết"}</button>
        <button type="button" className="admin-manage-action" disabled={busy} onClick={() => void resolve("KEEP")}>Giữ bài viết</button>
      </div>
    </> : <div className="admin-report-actions">
      <button type="button" className="admin-manage-action" disabled={busy} onClick={() => void togglePost()}>{report.postStatus === "HIDDEN" ? "Hiện lại bài viết" : "Ẩn bài viết"}</button>
    </div>}
    {report.reviewedAt && <p className="admin-manage-meta">Xử lý lúc {new Date(report.reviewedAt).toLocaleString("vi-VN")}{report.note ? ` · ${report.note}` : ""}</p>}
    {error && <p className="admin-manage-error" role="alert">{error}</p>}
  </article>;
}

export default function AdminCommunityPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [status, setStatus] = useState("OPEN");
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    void loadCommunityReports(token, status === "ALL" ? "" : status, 1, controller.signal)
      .then(rows => { if (!controller.signal.aborted) setReports(rows); })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Không thể tải hàng đợi kiểm duyệt."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, status, attempt]);
  function resolved(id: number, postStatus: string) {
    setReports(current => current.map(item => item.id === id
      ? { ...item, postStatus, status: postStatus === "HIDDEN" ? "RESOLVED" : item.status === "OPEN" ? "DISMISSED" : item.status, reviewedAt: new Date().toISOString() }
      : item));
  }
  return <div className="register-page cd-page"><PublicHeader authLink={{ to: "/dashboard", label: "Tổng quan" }} />
    <main className="cd-main admin-manage">
      <header className="admin-manage-header">
        <p className="admin-manage-eyebrow">KIỂM DUYỆT CỘNG ĐỒNG</p>
        <h1>Báo cáo bài viết</h1>
        <p>Xem hàng đợi báo cáo, ẩn nội dung vi phạm và lưu vết kiểm duyệt.</p>
        <p><Link to="/admin/manage">← Về quản lý hệ thống</Link></p>
      </header>
      <nav aria-label="Lọc báo cáo" className="admin-manage-tabs">
        {([["OPEN", "Chờ xử lý"], ["RESOLVED", "Đã ẩn"], ["DISMISSED", "Bỏ qua"], ["ALL", "Tất cả"]] as const).map(([value, label]) =>
          <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)}>{label}</button>)}
        <button type="button" className="admin-manage-action" onClick={() => setAttempt(value => value + 1)}>Tải lại</button>
      </nav>
      {loading ? <p className="admin-manage-empty" role="status">Đang tải báo cáo...</p>
        : error ? <p className="admin-manage-error" role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></p>
        : reports.length === 0 ? <p className="admin-manage-empty">Không có báo cáo trong mục này.</p>
        : <section className="admin-report-list" aria-label="Danh sách báo cáo">{reports.map(report => <ReportCard key={report.id} report={report} token={token!} onResolved={resolved} />)}</section>}
    </main>
  </div>;
}
