import { useEffect, useState } from "react";
import { BookOpen, ClipboardCheck, GraduationCap, Palette, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";
import CatalogCourseCard from "../components/CatalogCourseCard";
import PublicHeader from "../components/PublicHeader";
import { listCatalogCourses, type CatalogCourse } from "../lib/catalogApi";
import { setPageMeta } from "../lib/seo";
import { parseCatalogQuery } from "../logic/catalog";
import "../styles/guest-home.css";

export default function GuestHomePage() {
  const [featured, setFeatured] = useState<CatalogCourse[] | null>(null);
  const [featuredError, setFeaturedError] = useState(false);

  useEffect(() => {
    setPageMeta({
      title: "LINEA · Học vẽ theo cách của bạn",
      description: "Lộ trình học vẽ, studio luyện tập và phản hồi bài tập trong một không gian học tập.",
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void listCatalogCourses(parseCatalogQuery(""), controller.signal)
      .then((data) => { if (!controller.signal.aborted) setFeatured(data.items.slice(0, 3)); })
      .catch(() => { if (!controller.signal.aborted) setFeaturedError(true); });
    return () => controller.abort();
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

        <section className="guest-proof" aria-labelledby="guest-proof-title">
          <figure className="guest-proof-visual">
            <img
              src="/linea-studies-1200.jpg"
              srcSet="/linea-studies-800.jpg 800w, /linea-studies-1200.jpg 1200w"
              sizes="(max-width: 899px) 100vw, 50vw"
              width={1200}
              height={849}
              alt="Bàn luyện vẽ với hình khối, sắc độ và bài vẽ minh họa"
              loading="lazy"
              decoding="async"
            />
            <figcaption>Hình minh họa không gian luyện tập</figcaption>
          </figure>
          <div className="guest-proof-copy">
            <p className="guest-section-label guest-section-label-left">MỘT VÒNG LUYỆN TẬP</p>
            <h2 className="guest-section-title guest-section-title-left" id="guest-proof-title">Từ quan sát đến phản hồi</h2>
            <p className="guest-proof-intro">
              Mỗi bài học đi theo một vòng ngắn: nhìn kỹ, dựng hình, luyện tập và nhận một gợi ý
              đủ cụ thể để làm lại tốt hơn.
            </p>
            <ol className="guest-loop-list">
              <li><span>01</span><div><h3>Quan sát & dựng khối</h3><p>Chia hình phức tạp thành các khối lớn trước khi thêm chi tiết.</p></div></li>
              <li><span>02</span><div><h3>Luyện trong Studio</h3><p>Thử nét, sắc độ và bố cục ngay trên trình duyệt.</p></div></li>
              <li><span>03</span><div><h3>Nhận phản hồi</h3><p>Đọc nhận xét theo bài, rồi áp dụng vào lần vẽ tiếp theo.</p></div></li>
            </ol>
            <blockquote className="guest-feedback-quote">
              Bố cục đã rõ. Hãy chọn một điểm nhấn duy nhất và giảm chi tiết ở vùng phụ.
            </blockquote>
            <p className="guest-feedback-source">
              Ví dụ nhận xét bài vẽ
            </p>
          </div>
        </section>

        <section className="guest-featured" aria-labelledby="guest-featured-title">
          <div className="guest-featured-heading">
            <div>
              <p className="guest-section-label guest-section-label-left">KHÓA HỌC NỔI BẬT</p>
              <h2 className="guest-section-title guest-section-title-left" id="guest-featured-title">Bắt đầu từ một bài nhỏ</h2>
            </div>
            <Link className="guest-text-link" to="/courses">Xem tất cả khóa học →</Link>
          </div>
          {featured === null && !featuredError && <p className="guest-featured-status" role="status">Đang tải khóa học...</p>}
          {featuredError && <p className="guest-featured-status">Chưa tải được danh sách khóa học. <Link to="/courses">Xem trang khóa học</Link>.</p>}
          {featured && featured.length === 0 && <p className="guest-featured-status">Khóa học sẽ sớm được mở. <Link to="/register">Tạo tài khoản</Link> để nhận cập nhật.</p>}
          {featured && featured.length > 0 && (
            <div className="guest-course-grid" role="list">
              {featured.map((course) => <CatalogCourseCard key={course.ma_khoa_hoc} course={course} />)}
            </div>
          )}
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
