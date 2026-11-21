import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../auth/useAuth";
import PublicHeader from "../components/PublicHeader";
import { requestAdminApi } from "../lib/adminApi";
import ApprovalsPanel from "../components/ApprovalsPanel";
import AdminCourseDetails from "../components/AdminCourseDetails";
import { useApprovals } from "../hooks/useApprovals";
import { getCourseStatusLabel } from "../logic/courseEditor";
import type { ApprovalSection } from "../logic/approvals";
import "../styles/course-detail.css";
import "../styles/admin-management.css";

const userSchema = z.object({ id: z.string(), email: z.string(), displayName: z.string().nullable(), role: z.string(), isLocked: z.boolean(), lockVersion: z.number().int() });
const courseSchema = z.object({ id: z.number().int(), title: z.string(), status: z.string(), hidden: z.boolean(), visibilityVersion: z.number().int() });
const page = <T extends z.ZodType>(schema: T) => z.object({ items: z.array(schema), totalCount: z.number() });
type UserRow = z.infer<typeof userSchema>;
type CourseRow = z.infer<typeof courseSchema>;

export default function AdminManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { session } = useAuth();
  const token = session?.access_token;
  const requestedTab = searchParams.get("tab");
  const tab = requestedTab === "courses" || requestedTab === "review" ? requestedTab : "users";
  const section: ApprovalSection = searchParams.get("muc") === "giao-vien" ? "giao-vien" : "khoa-hoc";
  function setTab(nextTab: "users" | "courses" | "review", nextSection: ApprovalSection = "khoa-hoc") {
    setSearchParams(nextTab === "review" ? { tab: nextTab, muc: nextSection } : { tab: nextTab });
    setPageNumber(1);
    setNotice("");
    setSelectedCourseId(null);
  }
  const approvals = useApprovals(tab === "review", true, token);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ name: string; status: string; history: Array<{ status: string; reason: string | null; occurredAt: string }> } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setDetail(null);
    if (tab === "review") { setLoading(false); return () => controller.abort(); }
    if (token) void requestAdminApi(`/api/admin/${tab}`, { token, signal: controller.signal }, { page: pageNumber, pageSize: 20, search: query || undefined })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (tab === "users") { const parsed = page(userSchema).parse(data); setUsers(parsed.items); setTotal(parsed.totalCount); }
        else { const parsed = page(courseSchema).parse(data); setCourses(parsed.items); setTotal(parsed.totalCount); }
      }).catch(() => { if (!controller.signal.aborted) setError("Không thể tải dữ liệu. Vui lòng thử lại."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, tab, pageNumber, query, refresh]);

  async function showDetail(id: string | number) {
    if (!token) return;
    if (tab === "courses") { setSelectedCourseId(Number(id)); return; }
    setError(""); setBusy(true);
    try {
      const value = z.object({ displayName: z.string().nullable().optional(), email: z.string().optional(), title: z.string().optional(), role: z.string().optional(), status: z.string().optional(), isLocked: z.boolean().optional(), history: z.array(z.object({ status: z.string(), reason: z.string().nullable(), occurredAt: z.string() })) }).parse(await requestAdminApi(`/api/admin/${tab}/${id}`, { token }));
      setDetail({ name: value.title || value.displayName || value.email || "Chi tiết", status: value.status || `${value.role ?? ""} · ${value.isLocked ? "Đã khóa" : "Hoạt động"}`, history: value.history });
    }
    catch { setError("Không thể tải chi tiết. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  async function change(item: UserRow | CourseRow) {
    if (!token) return;
    const isUser = "isLocked" in item;
    const label = isUser ? item.email : item.title;
    const action = isUser ? (item.isLocked ? "mở khóa" : "khóa") : (item.hidden ? "hiện" : "ẩn");
    const reason = window.prompt(`Lý do ${action} ${label} (10–500 ký tự):`)?.trim();
    if (reason === undefined) return;
    if (reason.length < 10 || reason.length > 500) { setError("Lý do phải từ 10 đến 500 ký tự."); return; }
    if (!window.confirm(`Xác nhận ${action} ${label}?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const path = isUser ? `/api/admin/users/${item.id}/lock` : `/api/admin/courses/${item.id}/visibility`;
      const body = isUser ? { isLocked: !item.isLocked, reason, expectedVersion: item.lockVersion } : { hidden: !item.hidden, reason, expectedVersion: item.visibilityVersion };
      const updated = await requestAdminApi(path, { token, method: "PATCH", body });
      if (isUser) {
        const row = userSchema.parse(updated);
        setUsers(current => current.map(user => user.id === row.id ? row : user));
      } else {
        const row = courseSchema.parse(updated);
        setCourses(current => current.map(course => course.id === row.id ? row : course));
      }
      setNotice(`Đã ${action} ${label}.`);
    } catch { setError("Không thể cập nhật. Dữ liệu có thể đã thay đổi; hãy tải lại và thử lại."); }
    finally { setBusy(false); }
  }

  return <div className="register-page cd-page"><PublicHeader authLink={{ to: "/dashboard", label: "Tổng quan" }} />
    <main className="cd-main admin-manage"><header className="admin-manage-header"><p className="admin-manage-eyebrow">KHÔNG GIAN QUẢN TRỊ</p><h1>Quản lý hệ thống</h1><p>Quản lý tài khoản, khóa học và xét duyệt hồ sơ giáo viên.</p></header>
      <div className="admin-manage-links"><Link to="/admin">Tổng quan quản trị</Link><Link to="/admin/audit">Nhật ký kiểm toán</Link><Link to="/admin/community">Kiểm duyệt cộng đồng</Link></div>
      <nav aria-label="Quản trị" className="admin-manage-tabs">
        <button type="button" aria-pressed={tab === "users"} onClick={() => setTab("users")}>Người dùng</button>
        <button type="button" aria-pressed={tab === "courses"} onClick={() => setTab("courses")}>Khóa học</button>
        <button type="button" aria-pressed={tab === "review" && section === "khoa-hoc"} onClick={() => setTab("review")}>Duyệt khóa học ({approvals.counts.courses})</button>
        <button type="button" aria-pressed={tab === "review" && section === "giao-vien"} onClick={() => setTab("review", "giao-vien")}>Duyệt giáo viên ({approvals.counts.teachers})</button>
        <button className="admin-manage-action admin-manage-refresh" type="button" aria-label="Tải lại dữ liệu" title="Tải lại dữ liệu" aria-busy={loading || approvals.teacherLoading || approvals.courseLoading} disabled={busy || loading || approvals.teacherLoading || approvals.courseLoading} onClick={() => {
          if (tab === "review") approvals.refresh();
          else setRefresh(current => current + 1);
        }}><RefreshCw size={20} aria-hidden="true" className={loading || approvals.teacherLoading || approvals.courseLoading ? "is-spinning" : undefined} /></button>
      </nav>
      {tab === "review" ? <ApprovalsPanel section={section} data={approvals} /> : <section className="admin-manage-panel"><div className="admin-manage-panel-head"><div><h2>{tab === "users" ? "Danh sách người dùng" : "Danh sách khóa học"}</h2><p>{loading ? "Đang tải dữ liệu" : `${total} kết quả`}</p></div>
      <form className="admin-manage-search" onSubmit={(e) => { e.preventDefault(); setPageNumber(1); setQuery(search.trim()); }}><label className="sr-only" htmlFor="admin-search">Tìm kiếm</label><input id="admin-search" placeholder={tab === "users" ? "Tìm theo tên hoặc email" : "Tìm theo tên khóa học"} value={search} onChange={(e) => setSearch(e.target.value)} /><button type="submit">Tìm kiếm</button></form></div>
      {notice && <p className="admin-manage-notice" role="status">{notice}</p>}
      {error && <p className="admin-manage-error" role="alert">{error} <button type="button" onClick={() => setRefresh((n) => n + 1)}>Tải lại</button></p>}
      {loading ? <p className="admin-manage-empty" role="status">Đang tải...</p> : <>
        {total === 0 ? <p className="admin-manage-empty">Không có kết quả phù hợp.</p> : <ul className="admin-manage-list">{tab === "users" ? users.map((item) => <li key={item.id}><div className="admin-manage-item"><button className="admin-manage-name" type="button" disabled={busy} onClick={() => void showDetail(item.id)}>{item.displayName || item.email}</button><span className="admin-manage-meta">{item.email} · {item.role}</span></div><span className={`admin-manage-badge${item.isLocked ? " is-muted" : ""}`}>{item.isLocked ? "Đã khóa" : "Hoạt động"}</span><button className="admin-manage-action" type="button" disabled={busy} onClick={() => void change(item)}>{item.isLocked ? "Mở khóa" : "Khóa"}</button></li>) : courses.map((item) => <li key={item.id}><div className="admin-manage-item"><button className="admin-manage-name" type="button" disabled={busy} onClick={() => void showDetail(item.id)}>{item.title}</button><span className="admin-manage-meta">Mã khóa học: {item.id}</span></div><span className="admin-manage-badge is-muted">{getCourseStatusLabel(item.status)}</span>{item.status === "CHO_DUYET" && <button className="admin-manage-action" type="button" onClick={() => { setTab("review"); setNotice(""); }}>Xét duyệt</button>}<button className="admin-manage-action" type="button" disabled={busy || !["DA_DANG", "AN"].includes(item.status)} onClick={() => void change(item)}>{item.hidden ? "Hiện" : "Ẩn"}</button></li>)}</ul>}
        <div className="admin-manage-pagination"><button type="button" disabled={pageNumber <= 1} onClick={() => setPageNumber((n) => n - 1)}>Trước</button><span>Trang {pageNumber}</span><button type="button" disabled={pageNumber * 20 >= total} onClick={() => setPageNumber((n) => n + 1)}>Sau</button></div></>}</section>}
      {tab !== "review" && detail && <section className="admin-manage-detail"><h2>{detail.name}</h2><p>{detail.status}</p><h3>Lịch sử</h3>{detail.history.length ? <ul>{detail.history.map((entry, index) => <li key={`${entry.occurredAt}-${index}`}>{new Date(entry.occurredAt).toLocaleString("vi-VN")} · {entry.status} {entry.reason && `· ${entry.reason}`}</li>)}</ul> : <p>Chưa có lịch sử.</p>}</section>}
      {selectedCourseId !== null && <AdminCourseDetails courseId={selectedCourseId} onClose={() => setSelectedCourseId(null)} />}
    </main></div>;
}
