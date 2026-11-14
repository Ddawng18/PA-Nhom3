import { useEffect } from "react";
import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import "../styles/guest-home.css";

export default function GuestHomePage() {
  useEffect(() => {
    document.title = "LINEA · Học vẽ theo cách của bạn";
  }, []);

  return (
    <div className="register-page guest-page">
      <PublicHeader authLink={{ to: "/login", label: "Đăng nhập" }} />
      <main className="guest-main" aria-label="Tổng quan LINEA">
        <section className="guest-hero" aria-labelledby="guest-home-title">
          <p className="guest-eyebrow">LỘ TRÌNH CƠ BẢN</p>
          <h1 id="guest-home-title">Xây dựng thói quen mỗi ngày và tiến bộ bền vững.</h1>
          <p className="guest-description">
            Bài học có lộ trình, bài tập mỗi ngày, khu vực luyện vẽ và đánh giá tiến độ dành cho
            người mới bắt đầu đến trung cấp.
          </p>
          <Link className="guest-cta" to="/register">Bắt đầu luyện vẽ</Link>
        </section>
      </main>
    </div>
  );
}
