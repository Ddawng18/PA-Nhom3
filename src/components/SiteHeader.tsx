import { useEffect, useState } from "react";
import { Heart, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { getUserChip, type UserChip, type UserDisplayProfile } from "../lib/userDisplay";
import { loadUserProfile } from "../lib/userProfile";

const navigationItems = [
  { label: "Khám phá", href: null },
  { label: "Lộ trình", href: null },
  { label: "Cộng đồng", href: null },
  { label: "Sự kiện", href: null },
];

export default function SiteHeader() {
  const { user } = useAuth();
  const userId = user?.id;
  const [profile, setProfile] = useState<UserDisplayProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const chip: UserChip | null = user ? getUserChip(user, profile) : null;

  useEffect(() => {
    let isCurrent = true;
    setProfile(null);
    setProfileError(null);
    if (!userId) return () => {
      isCurrent = false;
    };

    async function loadProfile(activeUserId: string) {
      try {
        const data = await loadUserProfile(activeUserId);
        if (!isCurrent) return;
        if (data === null) return;
        setProfile(data);
      } catch {
        if (isCurrent) setProfileError("Không thể tải thông tin hồ sơ.");
      }
    }

    void loadProfile(userId);
    return () => {
      isCurrent = false;
    };
  }, [userId]);

  return (
    <header className="notif-header">
      <div className="notif-header-inner">
        <Link className="notif-wordmark" to="/" aria-label="LINEA - Trang chủ">LINEA</Link>
        <nav className="notif-navigation" aria-label="Điều hướng chính">
          {navigationItems.map((item) => (
            <a key={item.label} aria-disabled="true">{item.label}</a>
          ))}
        </nav>
        <label className="notif-search">
          <Search aria-hidden="true" size={18} />
          <input type="search" placeholder="Tìm khóa học" aria-label="Tìm khóa học" />
        </label>
        <div className="notif-header-actions">
          <button className="notif-header-icon" type="button" aria-label="Yêu thích">
            <Heart aria-hidden="true" size={21} />
          </button>
          <button className="notif-cart-button" type="button">
            Giỏ hàng
          </button>
          {chip ? (
            <Link
              className="notif-user-chip"
              to="/settings"
              aria-label={`${chip.name}, ${chip.email}`}
              title={`${chip.name} · ${chip.email}`}
            >
              {chip.avatarUrl ? (
                <img className="notif-user-avatar" src={chip.avatarUrl} alt="" />
              ) : (
                <span className="notif-user-avatar notif-user-avatar-fallback" aria-hidden="true">
                  {chip.initials}
                </span>
              )}
              <span className="notif-user-copy">
                <span className="notif-user-name">{chip.name}</span>
                <span className="notif-user-email">{chip.email}</span>
              </span>
            </Link>
          ) : (
            <Link className="notif-login-link" to="/login">Đăng nhập</Link>
          )}
        </div>
      </div>
      {profileError && <p className="notif-profile-error" role="alert">{profileError}</p>}
    </header>
  );
}
