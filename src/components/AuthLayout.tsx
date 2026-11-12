import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import PublicHeader from "./PublicHeader";
import "../styles/auth-form.css";

type AuthLayoutProps = {
  authLink: { to: string; label: string };
  children: ReactNode;
};

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
      <PublicHeader authLink={authLink} />
      <main className="register-main">
        <HeroText />
        {children}
      </main>
      <Footer />
    </div>
  );
}
