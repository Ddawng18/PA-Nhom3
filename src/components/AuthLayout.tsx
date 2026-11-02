import { useEffect, type ReactNode } from "react";
import { Heart, Search } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import "../styles/register.css";

type AuthLayoutProps = {
  authLink: { to: string; label: string };
  children: ReactNode;
};

function Header({ authLink }: { authLink: AuthLayoutProps["authLink"] }) {
  return (
    <header className="site-header">
      <div className="header-brand-group">
        <Link className="wordmark" to="/" aria-label="LINEA - Trang chủ">
          LINEA
        </Link>
        <nav className="header-nav" aria-label="Điều hướng chính">
          <a href="#">Khám phá</a>
          <a href="#">Lộ trình</a>
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
        <Link className="login-link" to={authLink.to}>
          {authLink.label}
        </Link>
      </div>
    </header>
  );
}

function HeroText() {
  return (
    <section className="hero-text" aria-label="Giới thiệu LINEA">
      <p className="eyebrow">HỌC VẼ, THEO CÁCH CỦA BẠN</p>
      <h2>
        Từng nét nhỏ.
        <br />
        Một thế giới mới.
      </h2>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <span>© LINEA · Học vẽ từ những điều cơ bản</span>
      <nav aria-label="Liên kết trợ giúp">
        <span>Cần trợ giúp?</span>
        <span aria-hidden="true">·</span>
        <a href="#">Điều khoản</a>
        <span aria-hidden="true">·</span>
        <a href="#">Quyền riêng tư</a>
      </nav>
    </footer>
  );
}

export default function AuthLayout({ authLink, children }: AuthLayoutProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "LINEA · Học vẽ theo cách của bạn",
      "/login": "Đăng nhập · LINEA",
      "/register": "Đăng ký · LINEA",
      "/forgot-password": "Quên mật khẩu · LINEA",
      "/reset-password": "Đặt lại mật khẩu · LINEA",
    };
    document.title = titles[pathname] ?? "LINEA";
  }, [pathname]);

  return (
    <div className="register-page">
      <Header authLink={authLink} />
      <main className="register-main">
        <HeroText />
        {children}
      </main>
      <Footer />
    </div>
  );
}
