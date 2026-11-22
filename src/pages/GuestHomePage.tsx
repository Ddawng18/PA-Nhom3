import { useEffect } from "react";
import { BookOpen, ClipboardCheck, GraduationCap, Palette, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import TeacherShowcase from "../components/TeacherShowcase";
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
          <div className="guest-actions">
            <Link className="guest-cta" to="/register">Bắt đầu luyện vẽ</Link>
            <Link className="guest-secondary-cta" to="/courses">Khám phá khóa học</Link>
          </div>
        </section>

        <section className="guest-features" aria-labelledby="guest-features-title">
          <p className="guest-section-label">CHỨC NĂNG CHÍNH</p>
          <h2 className="guest-section-title" id="guest-features-title">Bạn có thể làm gì trên LINEA</h2>
          <ul className="guest-feature-grid">
            <li>
              <Link className="guest-feature guest-feature-link" to="/courses">
                <span className="guest-feature-icon"><BookOpen size={20} aria-hidden="true" /></span>
                <h3>Khóa học</h3>
                <p>Tìm theo chủ đề và trình độ, xem chương và bài học trước khi ghi danh.</p>
              </Link>
            </li>
            <li className="guest-feature">
              <span className="guest-feature-icon"><ClipboardCheck size={20} aria-hidden="true" /></span>
              <h3>Bài tập và chấm bài</h3>
              <p>Nộp bài bằng ảnh trước hạn, nhận điểm trên thang 10 kèm nhận xét.</p>
            </li>
            <li className="guest-feature">
              <span className="guest-feature-icon"><TrendingUp size={20} aria-hidden="true" /></span>
              <h3>Tiến độ học tập</h3>
              <p>Theo dõi phần trăm bài học đã hoàn thành và bài tập đã chấm.</p>
            </li>
            <li>
              <Link className="guest-feature guest-feature-link" to="/studio">
                <span className="guest-feature-icon"><Palette size={20} aria-hidden="true" /></span>
                <h3>Studio luyện vẽ</h3>
                <p>Vẽ ngay trên trình duyệt và xuất bản vẽ của bạn.</p>
              </Link>
            </li>
            <li>
              <Link className="guest-feature guest-feature-link" to="/community">
                <span className="guest-feature-icon"><Users size={20} aria-hidden="true" /></span>
                <h3>Cộng đồng</h3>
                <p>Đăng bài kèm ảnh và bình luận cùng người học khác.</p>
              </Link>
            </li>
            <li className="guest-feature">
              <span className="guest-feature-icon"><GraduationCap size={20} aria-hidden="true" /></span>
              <h3>Giảng dạy</h3>
              <p>Đăng ký làm giáo viên, tạo khóa học và chấm bài cho học viên.</p>
            </li>
          </ul>
        </section>

        <section className="guest-showcase" aria-labelledby="guest-showcase-title">
          <p className="guest-section-label">KHÓA HỌC MẪU</p>
          <h2 className="guest-section-title" id="guest-showcase-title">Một cách bắt đầu nhẹ nhàng</h2>
          <article className="guest-showcase-card">
            <div className="guest-showcase-art" aria-hidden="true">M</div>
            <div className="guest-showcase-copy">
              <p className="guest-eyebrow">MÀU SẮC · CƠ BẢN · 8 BÀI</p>
              <h3>Màu kỹ thuật số cho minh họa</h3>
              <p>Làm quen với vòng màu, sắc độ và cách phối màu cho nhân vật qua bài tập nhỏ mỗi ngày.</p>
              <p className="guest-showcase-meta">Giảng viên minh họa: <Link to="/teachers/nmratist">NmRAtist</Link></p>
              <Link className="button button-primary" to="/courses">Xem khóa học</Link>
            </div>
          </article>
        </section>

        <TeacherShowcase />

        <section className="guest-steps" aria-labelledby="guest-steps-title">
          <p className="guest-section-label">CÁCH HỌC</p>
          <h2 className="guest-section-title" id="guest-steps-title">Ba bước để bắt đầu</h2>
          <ol className="guest-step-list">
            <li className="guest-step">
              <h3>Chọn khóa học</h3>
              <p>Xem danh mục và chọn khóa phù hợp trình độ.</p>
            </li>
            <li className="guest-step">
              <h3>Học và nộp bài</h3>
              <p>Học từng bài, nộp bài tập bằng ảnh.</p>
            </li>
            <li className="guest-step">
              <h3>Nhận điểm</h3>
              <p>Xem điểm, nhận xét và tiến độ của bạn.</p>
            </li>
          </ol>
        </section>

        <section className="guest-final" aria-labelledby="guest-final-title">
          <h2 id="guest-final-title">Sẵn sàng bắt đầu luyện vẽ?</h2>
          <Link className="guest-cta" to="/register">Tạo tài khoản</Link>
        </section>
      </main>
    </div>
  );
}
