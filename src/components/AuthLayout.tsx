import { useEffect, type FormEvent, type ReactNode } from "react";
import { Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import ConstructionSketch from "./ConstructionSketch";
import "../styles/global.css";
import "../styles/layout.css";
import "../styles/auth-form.css";

type AuthLayoutProps = {
  authLink: { to: string; label: string };
  children: ReactNode;
};

function Header({ authLink }: { authLink: AuthLayoutProps["authLink"] }) {
  const navigate = useNavigate();
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("search") ?? "").trim();
    navigate(query ? `/courses?search=${encodeURIComponent(query)}` : "/courses");
  }
  return (
    <header className="site-header">
      <div className="header-brand-group">
        <Link className="wordmark" to="/" aria-label="LINEA - Trang chủ">
          LINEA
        </Link>
        <nav className="header-nav" aria-label="Điều hướng chính">
          <Link to="/courses">Khám phá</Link>
          <Link to="/pricing">Học phí</Link>
        </nav>
      </div>

      <form className="search-field" role="search" aria-label="Tìm trên toàn bộ khóa học" onSubmit={submitSearch}>
        <Search aria-hidden="true" size={17} />
        <input name="search" aria-label="Tìm khóa học" placeholder="Tìm khóa học" type="search" maxLength={100} />
      </form>

      <div className="header-actions">
        <Link className="login-link" to={authLink.to}>
          {authLink.label}
        </Link>
      </div>
    </header>
  );
}

function BenefitList({ dark = false }: { dark?: boolean }) {
  const items = [
    "Lộ trình từ nền tảng đến bài tập thực hành",
    "Studio luyện vẽ ngay trên trình duyệt",
    "Phản hồi bài tập và tiến độ rõ ràng",
  ];
  return <ul className={`auth-benefit-list${dark ? " auth-benefit-list-dark" : ""}`}>
    {items.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}
  </ul>;
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
      <BenefitList />
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
  const isLogin = pathname === "/login";

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
    <div className={isLogin ? "register-page register-page--login" : "register-page"}>
      <Header authLink={authLink} />
      <main className="register-main">
        {isLogin ? (
          <section className="login-intro" aria-labelledby="login-intro-title">
            <ConstructionSketch variant="login" />
            <h2 id="login-intro-title">Trở lại<br /> bàn vẽ</h2>
            <p>Tiếp tục bài học digital art và luyện nét trong Studio LINEA.</p>
            <BenefitList dark />
          </section>
        ) : <HeroText />}
        {children}
      </main>
      <Footer />
    </div>
  );
}
