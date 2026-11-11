import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Check,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { supabase } from "../lib/supabase";
import "../styles/global.css";
import "../styles/settings.css";
import "../styles/admin-teacher-approval.css";

type TeacherStatus = "pending" | "approved" | "rejected";

type TeacherApplication = {
  id: string;
  name: string;
  email: string;
  specialty: string;
  submittedAt: string;
  bio: string;
  portfolio: string;
  document: string;
  documentMeta: string;
  status: TeacherStatus;
};

const statusLabels: Record<TeacherStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Đã từ chối",
};

function getDisplayName(email?: string | null): string {
  return email?.split("@")[0] || "admin";
}

function AdminSidebar({ email }: { email?: string | null }) {
  const items = [
    { label: "Tổng quan", icon: LayoutDashboard },
    { label: "Người dùng", icon: Users },
    { label: "Duyệt giáo viên", icon: ClipboardCheck, active: true },
    { label: "Khóa học", icon: BookOpen },
    { label: "Báo cáo", icon: BarChart3 },
    { label: "Cài đặt", icon: Settings },
  ];

  return (
    <aside className="admin-approval-sidebar">
      <Link className="admin-approval-brand" to="/dashboard" aria-label="LINEA - Trang quản trị">
        <strong>LINEA</strong>
        <span>Không gian quản trị</span>
      </Link>

      <nav className="admin-approval-navigation" aria-label="Điều hướng quản trị">
        {items.map(({ label, icon: Icon, active }) => (
          <button className={`admin-approval-nav-item${active ? " active" : ""}`} type="button" key={label}>
            <Icon aria-hidden="true" size={14} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <section className="admin-approval-help">
        <strong>QUẢN TRỊ VIÊN</strong>
        <p>Kiểm tra chuyên môn và hồ sơ trước khi cấp quyền giảng dạy.</p>
      </section>

      <div className="admin-approval-user">
        <UserRound aria-hidden="true" size={13} />
        <span>
          <strong>{getDisplayName(email)}</strong>
          <small>{email || "admin@linea.app"}</small>
          <small>Quyền quản trị viên</small>
        </span>
        <LogOut aria-hidden="true" size={13} />
      </div>
    </aside>
  );
}

export default function AdminTeacherApprovalPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<TeacherApplication[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<TeacherStatus>("pending");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    let active = true;

    async function loadApplications() {
      if (!supabase) {
        setLoadError("Ứng dụng chưa được cấu hình Supabase.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("ho_so_giao_vien")
        .select("ma_ho_so, ma_nguoi_dung, gioi_thieu, kinh_nghiem, trang_thai, ngay_gui")
        .order("ngay_gui", { ascending: true });

      if (!active) return;
      if (error) {
        setLoadError("Không thể tải danh sách hồ sơ giáo viên.");
        setLoading(false);
        return;
      }

      const userIds = (data ?? []).map((item) => item.ma_nguoi_dung);
      const profiles = userIds.length
        ? await supabase.from("nguoi_dung").select("id, display_name").in("id", userIds)
        : { data: [], error: null };
      if (!active) return;
      if (profiles.error) {
        setLoadError("Không thể tải thông tin người đăng ký.");
        setLoading(false);
        return;
      }

      const profileMap = new Map((profiles.data ?? []).map((profile) => [profile.id, profile.display_name]));
      const mapped = (data ?? []).map((item) => ({
        id: String(item.ma_ho_so),
        name: profileMap.get(item.ma_nguoi_dung) || "Người dùng LINEA",
        email: "",
        specialty: item.kinh_nghiem,
        submittedAt: new Date(item.ngay_gui).toLocaleString("vi-VN"),
        bio: item.gioi_thieu,
        portfolio: "",
        document: "",
        documentMeta: "",
        status: item.trang_thai === "DA_DUYET" ? "approved" : item.trang_thai === "TU_CHOI" ? "rejected" : "pending",
      })) satisfies TeacherApplication[];
      setApplications(mapped);
      setSelectedId(mapped[0]?.id ?? null);
      setLoading(false);
    }

    void loadApplications();
    return () => {
      active = false;
    };
  }, []);

  const selectedApplication = useMemo(
    () => applications.find((application) => application.id === selectedId) ?? null,
    [applications, selectedId],
  );
  const visibleApplications = applications.filter((application) =>
    application.status === activeStatus &&
    `${application.name} ${application.email}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const pendingCount = applications.filter((application) => application.status === "pending").length;
  const approvedCount = applications.filter((application) => application.status === "approved").length;
  const rejectedCount = applications.filter((application) => application.status === "rejected").length;

  async function updateStatus(status: TeacherStatus) {
    if (!selectedApplication || selectedApplication.status !== "pending") return;
    if (status === "rejected" && !rejectionReason.trim()) return;
    if (!supabase) {
      setActionError("Ứng dụng chưa được cấu hình Supabase.");
      return;
    }
    setActionError(null);
    const update = await supabase
      .from("ho_so_giao_vien")
      .update({
        trang_thai: status === "approved" ? "DA_DUYET" : "TU_CHOI",
        ly_do_tu_choi: status === "rejected" ? rejectionReason.trim() : null,
        ngay_duyet: new Date().toISOString(),
      })
      .eq("ma_ho_so", selectedApplication.id);
    if (update.error) {
      setActionError("Không thể cập nhật trạng thái hồ sơ.");
      return;
    }
    setApplications((current) =>
      current.map((application) =>
        application.id === selectedApplication.id ? { ...application, status } : application,
      ),
    );
    setRejectionReason("");
  }

  if (!user) return null;

  return (
    <div className="admin-approval-page">
      <AdminSidebar email={user.email} />
      <main className="admin-approval-main">
        <div className="admin-approval-content">
          <header className="admin-approval-heading">
            <div>
              <p className="admin-approval-eyebrow">QUẢN TRỊ / NGƯỜI DÙNG</p>
              <h1>Duyệt giáo viên</h1>
              <p>Xem xét hồ sơ và cấp quyền giảng dạy cho cộng đồng LINEA.</p>
            </div>
          </header>

          <section className="admin-approval-stats" aria-label="Thống kê duyệt giáo viên">
            <article className={`admin-approval-stat${activeStatus === "pending" ? " active" : ""}`}>
              <strong>{pendingCount}</strong>
              <span>Yêu cầu chờ duyệt</span>
            </article>
            <article className={`admin-approval-stat${activeStatus === "approved" ? " active" : ""}`}>
              <strong>{approvedCount}</strong>
              <span>Đã duyệt</span>
            </article>
            <article className={`admin-approval-stat${activeStatus === "rejected" ? " active" : ""}`}>
              <strong>{rejectedCount}</strong>
              <span>Đã từ chối</span>
            </article>
          </section>

          <div className="admin-approval-filters" aria-label="Bộ lọc hồ sơ">
            <button className={activeStatus === "pending" ? "selected" : ""} type="button" onClick={() => setActiveStatus("pending")}>Chờ duyệt · {pendingCount}</button>
            <button className={activeStatus === "approved" ? "selected" : ""} type="button" onClick={() => setActiveStatus("approved")}>Đã duyệt · {approvedCount}</button>
            <button className={activeStatus === "rejected" ? "selected" : ""} type="button" onClick={() => setActiveStatus("rejected")}>Đã từ chối · {rejectedCount}</button>
            <span>Sắp xếp: Cũ nhất trước ↓</span>
          </div>

          <section className="admin-approval-grid">
            <div className="admin-approval-list-card">
              <h2>Yêu cầu đăng ký</h2>
              <label className="admin-approval-search">
                <span className="sr-only">Tìm theo tên hoặc email</span>
                <input type="search" placeholder="Tìm theo tên hoặc email..." value={search} onChange={(event) => setSearch(event.target.value)} />
              </label>
              <div className="admin-approval-list">
                {visibleApplications.map((application) => (
                  <button
                    className={`admin-approval-list-item${application.id === selectedApplication?.id ? " selected" : ""}`}
                    type="button"
                    key={application.id}
                    onClick={() => setSelectedId(application.id)}
                  >
                    <strong>{application.name}</strong>
                    <span>{application.email}</span>
                    <span>{application.specialty}</span>
                    <small>{application.submittedAt}</small>
                  </button>
                ))}
                {!loading && !loadError && visibleApplications.length === 0 && (
                  <p className="admin-approval-empty" role="status">
                    {activeStatus === "pending" ? "Chưa có yêu cầu đăng ký giáo viên." : "Chưa có hồ sơ nào."}
                  </p>
                )}
              </div>
              <footer className="admin-approval-list-footer">
                <span>1–4 trong 12 yêu cầu</span>
                <span><button type="button">Trước</button><button type="button">Sau</button></span>
              </footer>
            </div>

            {loadError ? (
              <article className="admin-approval-detail-card admin-approval-empty-detail"><p role="alert">{loadError}</p></article>
            ) : loading ? (
              <article className="admin-approval-detail-card admin-approval-empty-detail"><p role="status">Đang tải hồ sơ...</p></article>
            ) : selectedApplication && selectedApplication.status === activeStatus ? (
              <article className="admin-approval-detail-card">
                <header className="admin-approval-detail-heading">
                  <div>
                    <h2>{selectedApplication.name}</h2>
                    <p>Hồ sơ GV-{selectedApplication.id.slice(0, 4).toUpperCase()} · Gửi lúc {selectedApplication.submittedAt}</p>
                  </div>
                  <span className={`admin-approval-status ${selectedApplication.status}`}>
                    {statusLabels[selectedApplication.status]}
                  </span>
                </header>

                <div className="admin-approval-meta">
                  <span><small>EMAIL LIÊN HỆ</small><strong>{selectedApplication.email}</strong></span>
                  <span><small>VAI TRÒ HIỆN TẠI</small><strong>Học viên → Giáo viên</strong></span>
                </div>

                <section>
                  <h3>Chuyên môn &amp; kinh nghiệm</h3>
                  <div className="admin-approval-tags"><span>{selectedApplication.specialty}</span><span>Digital Painting</span></div>
                  <p>{selectedApplication.bio}</p>
                </section>

                <section>
                  <h3>Hồ sơ minh chứng</h3>
                  <a className="admin-approval-document" href={selectedApplication.portfolio ? `https://${selectedApplication.portfolio}` : "#"} target="_blank" rel="noreferrer">
                    <span><strong>Portfolio cá nhân</strong><small>{selectedApplication.portfolio}</small></span><span>Xem portfolio ↗</span>
                  </a>
                  <button className="admin-approval-document" type="button" disabled={!selectedApplication.document}>
                    <span><strong>{selectedApplication.document}</strong><small>{selectedApplication.documentMeta}</small></span><span>Xem tài liệu ↗</span>
                  </button>
                </section>

                <section>
                  <h3>Định hướng giảng dạy</h3>
                  <p>“Tôi mong muốn giúp học viên xây dựng nền tảng vẽ nhân vật vững chắc, từ hình khối cơ bản đến một tác phẩm hoàn chỉnh.”</p>
                </section>

                <section className="admin-approval-rejection">
                  <h3>Lý do từ chối</h3>
                  <p>Bắt buộc khi từ chối; nội dung sẽ được gửi cho người đăng ký.</p>
                  <textarea
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    placeholder="Nhập lý do hoặc nội dung cần bổ sung..."
                    aria-label="Lý do từ chối"
                  />
                </section>

                {actionError && <p className="admin-approval-action-error" role="alert">{actionError}</p>}
                <footer className="admin-approval-actions">
                  <small>Khi duyệt, tài khoản được cấp vai trò Giáo viên và nhận email thông báo.</small>
                  <div>
                    <button className="admin-approval-reject-button" type="button" disabled={selectedApplication.status !== "pending"} onClick={() => updateStatus("rejected")}><X aria-hidden="true" size={14} />Từ chối</button>
                    <button className="admin-approval-approve-button" type="button" disabled={selectedApplication.status !== "pending"} onClick={() => updateStatus("approved")}><Check aria-hidden="true" size={14} />Duyệt giáo viên</button>
                  </div>
                </footer>
              </article>
            ) : (
              <article className="admin-approval-detail-card admin-approval-empty-detail">
                <p role="status">Chọn một hồ sơ để xem chi tiết.</p>
              </article>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
