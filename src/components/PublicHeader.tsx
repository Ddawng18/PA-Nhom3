import { Heart, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { getUserChip } from "../lib/userDisplay";
import { isNavItemActive, publicNavItems } from "../logic/publicNav";
import "../styles/global.css";
import "../styles/layout.css";

type PublicHeaderProps = {
  authLink: { to: string; label: string };
};

export default function PublicHeader({ authLink }: PublicHeaderProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const accountChip = user ? getUserChip(user) : null;

  return (
    <header className="site-header">
      <div className="header-brand-group">
        <Link className="wordmark" to="/" aria-label="LINEA - Trang chủ">
          LINEA
        </Link>
        <nav className="header-nav" aria-label="Điều hướng chính">
          {publicNavItems.map((item) => {
            if ("to" in item) {
              const isActive = isNavItemActive(pathname, item);
              return (
                <Link
                  key={item.label}
                  className="header-nav-link"
                  to={item.to}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                className="header-nav-button"
                type="button"
                aria-disabled="true"
                title="Tính năng đang phát triển"
              >
                {item.label}
              </button>
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
        ) : (
          <Link className="login-link" to={authLink.to}>
            {authLink.label}
          </Link>
        )}
      </div>
    </header>
  );
}
