import { Heart, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { getUserChip } from "../lib/userDisplay";
import { isNavItemActive, publicNavItems } from "../logic/publicNav";
import Sidebar from "./Sidebar";
import "../styles/global.css";
import "../styles/layout.css";
import "../styles/settings.css";

type PublicHeaderProps = {
  authLink: { to: string; label: string };
};

export default function PublicHeader({ authLink }: PublicHeaderProps) {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  const accountChip = user ? getUserChip(user) : null;

  if (loading) return null;
  if (user) {
    const displayName = accountChip?.name || user.email || "Thành viên LINEA";
    const initials = displayName.trim().split(/\s+/).slice(0, 2).map(part => part[0] ?? "").join("").toUpperCase();
    return <Sidebar user={user} displayName={displayName} initials={initials} />;
  }

  return (
    <header className="site-header">
      <div className="header-brand-group">
        <Link className="wordmark" to="/" aria-label="LINEA - Trang chủ">
          LINEA
        </Link>
        <nav className="header-nav" aria-label="Điều hướng chính">
          {publicNavItems.map((item) => {
            return (
              <Link
                key={item.label}
                className="header-nav-link"
                to={item.to}
                aria-current={isNavItemActive(pathname, item) ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <label className="search-field">
        <Search aria-hidden="true" size={17} />
        <input aria-label="Tìm khóa học" placeholder="Tìm khóa học" type="search" />
      </label>

      <div className="header-actions">
        <button className="icon-button favorite-button" type="button" aria-label="Yêu thích">
          <Heart aria-hidden="true" size={20} />
        </button>
        {accountChip ? (
          <Link
            className="header-user-chip"
            to="/dashboard"
            aria-label={`${accountChip.name}, ${accountChip.email}`}
            title={`${accountChip.name} · ${accountChip.email}`}
          >
            {accountChip.avatarUrl ? (
              <img className="header-user-avatar" src={accountChip.avatarUrl} alt="" />
            ) : (
              <span className="header-user-avatar header-user-avatar-fallback" aria-hidden="true">
                {accountChip.initials}
              </span>
            )}
            <span className="header-user-copy">
              <span className="header-user-name">{accountChip.name}</span>
              <span className="header-user-email">{accountChip.email}</span>
            </span>
          </Link>
        ) : !loading ? (
          <Link className="login-link" to={authLink.to}>
            {authLink.label}
          </Link>
        ) : null}
      </div>
    </header>
  );
}
