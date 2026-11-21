import { Menu, Search, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const accountChip = user ? getUserChip(user) : null;
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("search") ?? "").trim().slice(0, 100);
    navigate(value ? `/courses?search=${encodeURIComponent(value)}` : "/courses");
    setMenuOpen(false);
  }

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
        <nav id="public-navigation" className={`header-nav${menuOpen ? " is-open" : ""}`} aria-label="Điều hướng chính">
          {publicNavItems.map((item) => {
            return (
              <Link
                key={item.label}
                className="header-nav-link"
                to={item.to}
                aria-current={isNavItemActive(pathname, item) ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <form className="search-field" role="search" aria-label="Tìm trên toàn bộ khóa học" onSubmit={submitSearch}>
        <Search aria-hidden="true" size={17} />
        <input key={`${pathname}${search}`} name="search" defaultValue={new URLSearchParams(search).get("search") ?? ""} aria-label="Tìm khóa học trên thanh điều hướng" placeholder="Tìm khóa học" type="search" maxLength={100} />
      </form>

      <div className="header-actions">
        <button className="icon-button public-menu-toggle" type="button" aria-label={menuOpen ? "Đóng menu" : "Mở menu"} aria-controls="public-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>
          {menuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
          <span aria-hidden="true">Menu</span>
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
