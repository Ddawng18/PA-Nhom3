import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import { useEffect, useState } from "react";
import {
  CreditCard,
  LockKeyhole,
  LogOut,
  MoreHorizontal,
} from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { getAuthErrorMessage } from "../auth/errors";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { useUserRole } from "../hooks/useUserRole";
import { fetchVerifiedAccount, type VerifiedAccount } from "../lib/account";
import { loadUserProfile, saveUserProfile } from "../lib/userProfile";
import { getSettingsTabs, parseSettingsView, type SettingsTab } from "../logic/approvals";
import "../styles/settings.css";

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
  const { user, session, signOut, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const roleState = useUserRole();
  const view = parseSettingsView(location.search, roleState.role);
  const [displayName, setDisplayName] = useState(user ? getDisplayName(user) : "");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savedProfile, setSavedProfile] = useState<{ name: string; avatar: string } | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [passwordRequest, setPasswordRequest] = useState<{ message: string; failed: boolean } | null>(null);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [verifiedAccount, setVerifiedAccount] = useState<VerifiedAccount | null>(null);
  async function requestPasswordReset() {
    if (!user?.email || sendingPasswordReset) return;
    setSendingPasswordReset(true);
    setPasswordRequest(null);
    try {
      const { error } = await resetPassword(user.email);
      setPasswordRequest({ message: error ?? "Đã gửi liên kết đổi mật khẩu đến email của bạn.", failed: Boolean(error) });
    } catch {
      setPasswordRequest({ message: "Không gửi được liên kết đổi mật khẩu. Vui lòng thử lại.", failed: true });
    } finally {
      setSendingPasswordReset(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    void loadUserProfile(user.id).then((profile) => {
      if (controller.signal.aborted || !profile) return;
      const name = profile.display_name || getDisplayName(user);
      const avatar = profile.avatar_url || "";
      setDisplayName(name);
      setAvatarUrl(avatar);
      setSavedProfile({ name, avatar });
    }).catch(() => {
      if (!controller.signal.aborted) setProfileError("Không thể tải thông tin hồ sơ.");
    });
    return () => controller.abort();
  }, [user]);

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
    if (roleState.loading || searchParams.get("tab") !== "phe-duyet") return;
    const section = searchParams.get("muc") === "giao-vien" ? "giao-vien" : "khoa-hoc";
    navigate(roleState.role === "admin" ? `/admin/manage?tab=review&muc=${section}` : "/settings", { replace: true });
  }, [navigate, roleState.loading, roleState.role, searchParams]);

  if (!user) return null;
  const currentUser = user;

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

  async function handleSaveProfile() {
    if (isSavingProfile) return;
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileMessage(null);
    try {
      const saved = await saveUserProfile(currentUser.id, { display_name: displayName, avatar_url: avatarUrl });
      const name = saved.display_name || getDisplayName(currentUser);
      const avatar = saved.avatar_url || "";
      setDisplayName(name);
      setAvatarUrl(avatar);
      setSavedProfile({ name, avatar });
      setProfileMessage("Đã lưu hồ sơ.");
    } catch {
      setProfileError("Không thể lưu hồ sơ. Vui lòng thử lại.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  function selectTab(tab: SettingsTab) {
    const next = new URLSearchParams();
    if (tab !== "ho-so") next.set("tab", tab);
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
              <p>Quản lý hồ sơ và bảo mật tài khoản.</p>
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
          {profileError && <p className="settings-error" role="alert">{profileError}</p>}

          <nav className="settings-tabs" aria-label="Các mục cài đặt">
            {getSettingsTabs(roleState.role).map((tab) => {
              const labels: Record<SettingsTab, string> = {
                "ho-so": "Hồ sơ",
                "bao-mat": "Bảo mật",
                "lich-su-mua-hang": "Lịch sử mua hàng",
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
                </button>
              );
            })}
          </nav>

          <div className="settings-account-panels">
            {view.tab === "ho-so" && (
              <section className="settings-card profile-card">
                <div className="card-heading profile-card-heading">
                  <div>
                    <span className="card-icon"><span className="avatar avatar-card">{initials}</span></span>
                    <h2>Hồ sơ</h2>
                    <p>Thông tin hiển thị và email dùng để nhận thông báo từ LINEA.</p>
                  </div>
                  <span className="avatar avatar-profile" aria-hidden="true">{initials}</span>
                </div>

                <div className="profile-fields">
                  <FormField id="settings-display-name" label="Tên hiển thị" className="settings-field">
                    <input id="settings-display-name"
                      type="text"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                    />
                  </FormField>
                  <FormField id="settings-email" label="Địa chỉ email" className="settings-field">
                    <input id="settings-email" type="email" value={user.email ?? ""} readOnly />
                  </FormField>
                  <FormField id="settings-avatar-url" label="Ảnh đại diện (URL)" className="settings-field">
                    <input id="settings-avatar-url"
                      type="url"
                      value={avatarUrl}
                      placeholder="https://..."
                      onChange={(event) => setAvatarUrl(event.target.value)}
                    />
                  </FormField>
                  <FormField id="settings-role" label="Vai trò tài khoản" className="settings-field">
                    <input id="settings-role"
                      type="text"
                      value={roleState.role ? roleLabels[roleState.role] : roleState.loading ? "Đang tải..." : "Chưa xác định"}
                      readOnly
                      aria-busy={roleState.loading}
                    />
                  </FormField>
                </div>
                <div className="profile-actions">
                  <Button type="button" disabled={isSavingProfile} onClick={() => void handleSaveProfile()}>
                    {isSavingProfile ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                  <Button variant="outline" type="button" disabled={isSavingProfile} onClick={() => {
                    setDisplayName(savedProfile?.name ?? userDisplayName);
                    setAvatarUrl(savedProfile?.avatar ?? "");
                    setProfileMessage(null);
                  }}>Bỏ qua</Button>
                </div>
                {profileMessage && <p role="status">{profileMessage}</p>}
              </section>
            )}
            {view.tab === "bao-mat" && (
              <section className="settings-card security-card">
                <div className="card-heading">
                  <span className="card-icon"><LockKeyhole aria-hidden="true" size={18} /></span>
                  <h2>Bảo mật</h2>
                  <p>Gửi liên kết đặt lại mật khẩu đến email đăng nhập của bạn.</p>
                </div>
                <div className="security-password">
                  <Button variant="outline" disabled={!user.email || sendingPasswordReset} onClick={() => void requestPasswordReset()}>
                    {sendingPasswordReset ? "Đang gửi..." : "Gửi email đổi mật khẩu"}
                  </Button>
                </div>
                {passwordRequest && <p role={passwordRequest.failed ? "alert" : "status"}>{passwordRequest.message}</p>}
              </section>
            )}
            {view.tab === "lich-su-mua-hang" && (
              <section className="settings-card purchase-card">
                <div className="card-heading purchase-heading">
                  <span className="card-icon"><CreditCard aria-hidden="true" size={18} /></span>
                  <h2>Lịch sử mua hàng</h2>
                  <p>Đơn hàng và trạng thái thanh toán được quản lý tập trung tại trang Đơn hàng.</p>
                </div>
                <div className="purchase-actions">
                  <Link className="button button-primary" to="/orders">Xem lịch sử thanh toán</Link>
                </div>
              </section>
            )}
          </div>

          <div className="settings-mobile-user">
            <MoreHorizontal aria-hidden="true" size={18} />
            <span>{userDisplayName}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
