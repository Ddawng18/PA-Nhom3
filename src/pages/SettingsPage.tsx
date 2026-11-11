import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  LockKeyhole,
  LogOut,
  MoreHorizontal,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { getAuthErrorMessage } from "../auth/errors";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import ApprovalsPanel from "../components/ApprovalsPanel";
import { useUserRole } from "../hooks/useUserRole";
import { useApprovals } from "../hooks/useApprovals";
import { fetchVerifiedAccount, type VerifiedAccount } from "../lib/account";
import { getSettingsTabs, parseSettingsView, type SettingsTab } from "../logic/approvals";
import "../styles/settings.css";

type ToggleSettingProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
};

function ToggleSetting({ label, description, checked, onChange }: ToggleSettingProps) {
  return (
    <div className="notification-row">
      <span className="notification-copy">
        <span className="notification-title">{label}</span>
        <span className="notification-description">{description}</span>
      </span>
      <button
        className={`toggle-switch${checked ? " checked" : ""}`}
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        onClick={onChange}
      >
        <span />
      </button>
    </div>
  );
}

function getDisplayName(user: User): string {
  const metadataName = user.user_metadata.display_name;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }
  return user.email?.split("@")[0] || "Học viên LINEA";
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

const roleLabels = {
  student: "Học viên",
  teacher: "Giáo viên",
  admin: "Quản trị viên",
} as const;

export default function SettingsPage() {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const roleState = useUserRole();
  const isAdmin = !roleState.loading && !roleState.error && roleState.role === "admin";
  const view = parseSettingsView(location.search, roleState.role);
  const approvals = useApprovals(view.tab === "phe-duyet" && isAdmin, isAdmin, session?.access_token);
  const [displayName, setDisplayName] = useState(user ? getDisplayName(user) : "");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [verifiedAccount, setVerifiedAccount] = useState<VerifiedAccount | null>(null);
  const [notifications, setNotifications] = useState({
    daily: true,
    weekly: false,
    streak: true,
  });

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl || !session?.access_token) return;
    const controller = new AbortController();
    fetchVerifiedAccount(apiUrl, session.access_token, controller.signal)
      .then((account) => setVerifiedAccount(account))
      .catch(() => { if (!controller.signal.aborted) setVerifiedAccount(null); });
    return () => controller.abort();
  }, [session?.access_token]);

  useEffect(() => {
    if (roleState.loading || roleState.role === "admin" || searchParams.get("tab") !== "phe-duyet") return;
    navigate("/settings", { replace: true });
  }, [navigate, roleState.loading, roleState.role, searchParams]);

  if (!user) return null;

  const userDisplayName = getDisplayName(user);
  const verifiedRole = verifiedAccount?.id === user.id ? verifiedAccount.role : null;
  const initials = getInitials(userDisplayName);

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      const result = await signOut();
      if (result.error) {
        setSignOutError(result.error);
      } else {
        navigate("/login", { replace: true });
      }
    } catch (error) {
      setSignOutError(getAuthErrorMessage(error instanceof Error ? error.message : undefined));
    } finally {
      setIsSigningOut(false);
    }
  }

  function selectTab(tab: SettingsTab) {
    const next = new URLSearchParams();
    if (tab !== "ho-so") next.set("tab", tab);
    if (tab === "phe-duyet") next.set("muc", view.muc);
    setSearchParams(next);
  }

  return (
    <div className="settings-shell">
      <Sidebar user={user} displayName={userDisplayName} initials={initials} />

      <main className="settings-main">
        <div className="settings-content">
          <header className="settings-page-heading">
            <div>
              <p className="settings-eyebrow">TÀI KHOẢN CỦA BẠN</p>
              <h1>Hồ sơ &amp; Cài đặt</h1>
              <p>Quản lý thông tin cá nhân, sở thích học tập và các thiết lập của tài khoản.</p>
              {verifiedRole && <p>Vai trò: {{ student: "Học viên", teacher: "Giáo viên", admin: "Quản trị viên" }[verifiedRole]}</p>}
            </div>
            <div className="settings-heading-actions">
              <span className="avatar avatar-heading" aria-hidden="true">{initials}</span>
              <button
                className="button button-outline logout-button"
                type="button"
                disabled={isSigningOut}
                onClick={handleSignOut}
              >
                <LogOut aria-hidden="true" size={16} />
                {isSigningOut ? "Đang đăng xuất..." : "Đăng xuất"}
              </button>
            </div>
          </header>

          {signOutError && <p className="settings-error" role="alert">{signOutError}</p>}

          <nav className="settings-tabs" aria-label="Các mục cài đặt">
            {getSettingsTabs(isAdmin ? roleState.role : "student").map((tab) => {
              const labels: Record<SettingsTab, string> = {
                "ho-so": "Hồ sơ",
                "ua-thich": "Ưa thích học tập",
                "bao-mat": "Bảo mật",
                "lich-su-mua-hang": "Lịch sử mua hàng",
                "phe-duyet": "Phê duyệt",
              };
              return (
                <button
                  className={`settings-tab${view.tab === tab ? " active" : ""}`}
                  type="button"
                  aria-current={view.tab === tab ? "page" : undefined}
                  key={tab}
                  onClick={() => selectTab(tab)}
                >
                  {labels[tab]}
                  {tab === "phe-duyet" && approvals.counts.total > 0 && (
                    <span
                      className="appr-tab-count"
                      aria-label={`${approvals.counts.total} mục đang chờ duyệt`}
                    >
                      {approvals.counts.total}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {view.tab === "phe-duyet" && isAdmin ? (
            <ApprovalsPanel
              section={view.muc}
              setSection={(section) => {
                const next = new URLSearchParams(searchParams);
                next.set("tab", "phe-duyet");
                next.set("muc", section);
                setSearchParams(next);
              }}
              data={approvals}
            />
          ) : (
          <div className={`settings-columns${view.tab === "ho-so" ? "" : " appr-settings-columns-single"}`}>
            <div className="settings-column" hidden={view.tab === "ua-thich" || view.tab === "lich-su-mua-hang"}>
              <section className="settings-card profile-card" hidden={view.tab !== "ho-so"}>
                <div className="card-heading profile-card-heading">
                  <div>
                    <span className="card-icon"><span className="avatar avatar-card">{initials}</span></span>
                    <h2>Hồ sơ</h2>
                    <p>Thông tin hiển thị và email dùng để nhận thông báo từ LINEA.</p>
                  </div>
                  <span className="avatar avatar-profile" aria-hidden="true">{initials}</span>
                </div>

                <div className="profile-fields">
                  <label className="settings-field">
                    <span>Tên hiển thị</span>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                    />
                  </label>
                  <label className="settings-field">
                    <span>Địa chỉ email</span>
                    <input type="email" value={user.email ?? ""} readOnly />
                  </label>
                  <label className="settings-field">
                    <span>Vai trò tài khoản</span>
                    <input
                      type="text"
                      value={roleState.role ? roleLabels[roleState.role] : roleState.loading ? "Đang tải..." : "Chưa xác định"}
                      readOnly
                      aria-busy={roleState.loading}
                    />
                  </label>
                  <label className="settings-field">
                    <span>Mục tiêu hàng ngày</span>
                    <span className="field-with-icon">
                      <Clock3 aria-hidden="true" size={16} />
                      <input type="text" value="20 phút" readOnly />
                      <ChevronRight aria-hidden="true" size={16} />
                    </span>
                  </label>
                </div>
                <div className="profile-actions">
                  <button className="button button-primary" type="button">Lưu thay đổi</button>
                  <button className="button button-outline" type="button">Bỏ qua</button>
                </div>
              </section>

              <section className="settings-card security-card" hidden={view.tab !== "ho-so" && view.tab !== "bao-mat"}>
                <div className="card-heading">
                  <span className="card-icon"><LockKeyhole aria-hidden="true" size={18} /></span>
                  <h2>Bảo mật</h2>
                  <p>Quản lý mật khẩu và trạng thái đăng nhập của tài khoản.</p>
                </div>
                <div className="security-password">
                  <label className="settings-field">
                    <span>Mật khẩu</span>
                    <input type="password" value="lineasecurepassword" disabled readOnly />
                  </label>
                  <button className="button button-outline" type="button">Đổi mật khẩu</button>
                </div>
                <div className="device-section">
                  <h3>Thiết bị đang đăng nhập</h3>
                  <div className="device-row">
                    <span className="device-icon"><ShieldCheck aria-hidden="true" size={18} /></span>
                    <span className="device-copy">
                      <span>Chrome trên macOS</span>
                      <span>Hà Nội · Đang hoạt động</span>
                    </span>
                    <span className="device-current">Chính</span>
                  </div>
                </div>
              </section>
            </div>

            <div className="settings-column" hidden={view.tab === "bao-mat"}>
              <section className="settings-card preferences-card" hidden={view.tab !== "ho-so" && view.tab !== "ua-thich"}>
                <div className="card-heading">
                  <span className="card-icon"><Sparkles aria-hidden="true" size={18} /></span>
                  <h2>Ưu thích học tập</h2>
                  <p>Trạng thái mặc định cho kế hoạch học hàng ngày.</p>
                </div>
                <div className="preference-pills">
                  <span>Cơ bản</span>
                  <span>20 phút/ngày</span>
                  <span>Minh họa nhân vật</span>
                </div>
                <div className="goal-progress-heading">
                  <span>Tiến độ mục tiêu</span>
                  <span>18/20 phút · 90%</span>
                </div>
                <div className="goal-progress" role="progressbar" aria-label="Tiến độ mục tiêu hàng ngày" aria-valuenow={90} aria-valuemin={0} aria-valuemax={100}>
                  <span />
                </div>
                <div className="next-lesson">
                  <span className="next-lesson-icon"><BookOpen aria-hidden="true" size={18} /></span>
                  <span>
                    <span className="next-lesson-label">Bài học tiếp theo</span>
                    <strong>Gesture và nhịp điệu</strong>
                    <span className="next-lesson-course">Khóa học: Vẽ nhân vật từ khối cơ bản</span>
                  </span>
                  <ArrowUpRight aria-hidden="true" size={16} />
                </div>
              </section>

              <section className="settings-card notifications-card" hidden={view.tab !== "ho-so" && view.tab !== "ua-thich"}>
                <div className="card-heading">
                  <span className="card-icon"><Bell aria-hidden="true" size={18} /></span>
                  <h2>Thông báo</h2>
                  <p>Chọn loại thông báo bạn muốn nhận qua email và ứng dụng.</p>
                </div>
                <div className="notification-list">
                  <ToggleSetting
                    label="Nhắc nhở hàng ngày"
                    description="Nhắc bạn dành thời gian luyện tập."
                    checked={notifications.daily}
                    onChange={() => setNotifications((current) => ({ ...current, daily: !current.daily }))}
                  />
                  <ToggleSetting
                    label="Tổng kết hàng tuần"
                    description="Nhận cập nhật về tiến độ học tập."
                    checked={notifications.weekly}
                    onChange={() => setNotifications((current) => ({ ...current, weekly: !current.weekly }))}
                  />
                  <ToggleSetting
                    label="Phục hồi chuỗi"
                    description="Nhắc bạn khi chuỗi học tập sắp gián đoạn."
                    checked={notifications.streak}
                    onChange={() => setNotifications((current) => ({ ...current, streak: !current.streak }))}
                  />
                </div>
              </section>

              <section className="settings-card purchase-card" hidden={view.tab !== "ho-so" && view.tab !== "lich-su-mua-hang"}>
                <div className="card-heading purchase-heading">
                  <span className="card-icon"><CreditCard aria-hidden="true" size={18} /></span>
                  <h2>Lịch sử mua hàng</h2>
                  <p>Xem lại đơn hàng gần đây và trạng thái thanh toán.</p>
                </div>
                <div className="purchase-course">
                  <span className="purchase-course-icon"><Check aria-hidden="true" size={17} /></span>
                  <span>
                    <strong>Vẽ nhân vật từ hình khối cơ bản</strong>
                    <span>#LN-2026-1048 · 20/10/2026</span>
                  </span>
                  <span className="paid-badge">Đã thanh toán</span>
                </div>
                <div className="purchase-summary">
                  <div><span>Giá gốc</span><span>599.000đ</span></div>
                  <div><span>Ưu đãi khóa học</span><span>−200.000đ</span></div>
                  <div className="purchase-total"><strong>Đã thanh toán</strong><strong>399.000đ</strong></div>
                </div>
                <div className="purchase-actions">
                  <button className="button button-primary" type="button">Vào khóa học</button>
                  <button className="button button-outline" type="button">Xem biên nhận</button>
                </div>
              </section>
            </div>
          </div>
          )}

          <div className="settings-mobile-user">
            <MoreHorizontal aria-hidden="true" size={18} />
            <span>{userDisplayName}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
