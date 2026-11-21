import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { learningError } from "../lib/learningApi";
import { loadAdminAudit, type AuditRow } from "../lib/adminWorkspaceApi";
import "../styles/settings.css";
import "../styles/teacher-workspace.css";

const auditTypes = [
  ["", "Tất cả"],
  ["NGUOI_DUNG", "Người dùng"],
  ["HO_SO_GIAO_VIEN", "Hồ sơ giáo viên"],
  ["KHOA_HOC", "Khóa học"],
  ["BAI_NOP", "Bài nộp"],
  ["DON_HANG", "Đơn hàng"],
  ["CONG_DONG", "Cộng đồng"],
] as const;

function displayName(email: string | undefined, metadata: Record<string, unknown>) {
  const name = metadata.display_name;
  return typeof name === "string" && name.trim() ? name.trim() : email?.split("@")[0] || "Quản trị viên";
}

export default function AdminAuditPage() {
  const { user, session } = useAuth();
  const token = session?.access_token;
  const [params, setParams] = useSearchParams();
  const objectType = params.get("loai") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const [items, setItems] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    void loadAdminAudit(token, objectType, page, controller.signal)
      .then(result => { if (!controller.signal.aborted) { setItems(result.items); setTotal(result.total); } })
      .catch(err => { if (!controller.signal.aborted) setError(learningError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, objectType, page, attempt]);
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
        <div><p className="settings-eyebrow">NHẬT KÝ KIỂM TOÁN</p><h1>Lịch sử thao tác quản trị</h1><p>Duyệt hồ sơ, khóa tài khoản, đổi vai trò, chấm bài và kiểm duyệt cộng đồng.</p></div>
        <Link className="button button-outline" to="/admin">Về tổng quan</Link>
      </header>
      <div className="teacher-queue-filters">
        <label>Loại đối tượng <select value={objectType} onChange={event => update({ loai: event.target.value, page: "" })}>
          {auditTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <button className="button button-outline" type="button" onClick={() => setAttempt(value => value + 1)}>Tải lại</button>
      </div>
      {loading ? <p role="status">Đang tải nhật ký...</p>
        : error ? <section className="settings-card"><p className="settings-error" role="alert">{error}</p><button className="button button-outline" type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></section>
        : items.length === 0 ? <section className="settings-card"><p>Chưa có bản ghi phù hợp.</p></section>
        : <>
          <p className="teacher-queue-count" role="status">{total} bản ghi</p>
          <div className="teacher-table-wrap"><table className="teacher-table">
            <caption className="sr-only">Lịch sử thao tác quản trị</caption>
            <thead><tr><th scope="col">Thời gian</th><th scope="col">Người thực hiện</th><th scope="col">Đối tượng</th><th scope="col">Trạng thái</th><th scope="col">Lý do</th></tr></thead>
            <tbody>{items.map(entry => <tr key={entry.id}>
              <td>{new Date(entry.occurredAt).toLocaleString("vi-VN")}</td>
              <th scope="row">{entry.actor}</th>
              <td>{entry.objectType} #{entry.objectId}</td>
              <td>{entry.previousStatus ? `${entry.previousStatus} → ` : ""}{entry.status}</td>
              <td>{entry.reason || "—"}</td>
            </tr>)}</tbody>
          </table></div>
          <nav className="teacher-pagination" aria-label="Phân trang nhật ký">
            <button className="button button-outline" type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Trước</button>
            <span>Trang {page}</span>
            <button className="button button-outline" type="button" disabled={page * 50 >= total} onClick={() => update({ page: String(page + 1) })}>Sau</button>
          </nav>
        </>}
    </div></main>
  </div>;
}
