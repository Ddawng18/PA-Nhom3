import { useEffect } from "react";
import { ArrowRight, Check, CircleHelp, CreditCard, MessageSquareText } from "lucide-react";
import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import { setPageMeta } from "../lib/seo";
import "../styles/guest-home.css";
import "../styles/pricing.css";

const faqItems = [
  {
    question: "Học thử có cần tài khoản không?",
    answer: "Bạn có thể xem bài học mẫu và nội dung khóa học trên trang chi tiết mà không cần đăng nhập. Ghi danh, nộp bài và lưu tiến độ cần một tài khoản LINEA.",
  },
  {
    question: "Thanh toán có phải tiền thật không?",
    answer: "Chưa. Bản thử nghiệm đang dùng chế độ thanh toán demo/sandbox và không thu tiền thật. Không nhập thông tin thẻ hoặc chuyển khoản cho bất kỳ mã QR minh họa nào.",
  },
  {
    question: "Khóa học hiện tại có mất phí không?",
    answer: "Các khóa đang mở trong danh mục hiện có giá 0 ₫. Học phí sẽ được công bố rõ trước khi mở bất kỳ lớp trả phí nào.",
  },
  {
    question: "Phản hồi bài tập hoạt động thế nào?",
    answer: "Bạn nộp bài bằng ảnh trước hạn. Giảng viên chấm theo thang 10 và để lại nhận xét. Phản hồi trên trang chủ và hồ sơ mẫu là ví dụ minh họa, không phải đánh giá bài nộp thật.",
  },
  {
    question: "Có gói định kỳ hoặc tự động trừ tiền không?",
    answer: "Không. Hiện chưa có gói định kỳ, chưa lưu phương thức thanh toán và không tự động trừ tiền.",
  },
];

export default function PricingFaqPage() {
  useEffect(() => {
    setPageMeta({
      title: "Học phí & FAQ · LINEA",
      description: "Học phí LINEA: khóa học đang mở miễn phí, thanh toán demo không thu tiền thật, không tự động trừ tiền.",
    });
  }, []);

  return (
    <div className="register-page pricing-page">
      <PublicHeader authLink={{ to: "/login", label: "Đăng nhập" }} />
      <main className="pricing-main">
        <section className="pricing-hero" aria-labelledby="pricing-title">
          <p className="guest-eyebrow">HỌC PHÍ MINH BẠCH</p>
          <h1 id="pricing-title">Bắt đầu miễn phí. Chỉ trả tiền khi bạn cần thêm.</h1>
          <p>
            Các khóa đang mở trong bản thử nghiệm có giá 0 ₫. Thanh toán đang ở chế độ demo,
            không thu tiền thật và không tự động trừ tiền.
          </p>
          <div className="pricing-actions">
            <Link className="guest-cta" to="/register">Tạo tài khoản miễn phí</Link>
            <Link className="guest-secondary-cta" to="/courses">Xem khóa học</Link>
          </div>
        </section>

        <section className="pricing-grid" aria-label="Các lựa chọn học phí">
          <article className="pricing-card pricing-card-featured">
            <span className="pricing-card-icon"><Check aria-hidden="true" size={17} /></span>
            <p className="pricing-card-label">ĐANG MỞ</p>
            <h2>Tài khoản LINEA</h2>
            <p className="pricing-price">0 ₫</p>
            <p className="pricing-card-copy">Bắt đầu học, lưu tiến độ và luyện tập trong Studio.</p>
            <ul>
              <li>Truy cập các khóa đang mở</li>
              <li>Xem bài học mẫu trước khi ghi danh</li>
              <li>Studio luyện vẽ trên trình duyệt</li>
              <li>Cộng đồng và bài nộp</li>
            </ul>
            <Link className="pricing-card-cta" to="/register">Tạo tài khoản <ArrowRight aria-hidden="true" size={14} /></Link>
          </article>

          <article className="pricing-card">
            <span className="pricing-card-icon"><CreditCard aria-hidden="true" size={17} /></span>
            <p className="pricing-card-label">BẢN THỬ NGHIỆM</p>
            <h2>Khóa học đang mở</h2>
            <p className="pricing-price">0 ₫</p>
            <p className="pricing-card-copy">Học theo lộ trình, xem chương và bài học mẫu.</p>
            <ul>
              <li>Bài học có cấu trúc theo chương</li>
              <li>Bài tập và tiến độ</li>
              <li>Không cần thẻ thanh toán</li>
            </ul>
            <Link className="pricing-card-cta pricing-card-cta-outline" to="/courses">Khám phá khóa học <ArrowRight aria-hidden="true" size={14} /></Link>
          </article>

          <article className="pricing-card">
            <span className="pricing-card-icon"><MessageSquareText aria-hidden="true" size={17} /></span>
            <p className="pricing-card-label">ĐANG THỬ NGHIỆM</p>
            <h2>Lớp có phản hồi</h2>
            <p className="pricing-price pricing-price-small">Chưa mở bán</p>
            <p className="pricing-card-copy">Phản hồi bài tập theo lộ trình đang được hoàn thiện.</p>
            <ul>
              <li>Chấm bài và nhận xét</li>
              <li>Ví dụ phản hồi từ hồ sơ mẫu</li>
              <li>Chưa có gói định kỳ</li>
            </ul>
            <Link className="pricing-card-cta pricing-card-cta-outline" to="/teachers/nmratist">Xem hồ sơ mẫu <ArrowRight aria-hidden="true" size={14} /></Link>
          </article>
        </section>

        <section className="pricing-faq" aria-labelledby="pricing-faq-title">
          <div className="pricing-faq-heading">
            <p className="guest-section-label guest-section-label-left">CÂU HỎI THƯỜNG GẶP</p>
            <h2 id="pricing-faq-title">Trước khi bạn bắt đầu</h2>
            <p>Nếu còn điều chưa rõ, hãy xem nhanh các câu trả lời dưới đây.</p>
          </div>
          <div className="pricing-faq-list">
            {faqItems.map((item) => (
              <details className="pricing-faq-item" key={item.question}>
                <summary>
                  <CircleHelp aria-hidden="true" size={16} />
                  <span>{item.question}</span>
                  <span className="pricing-faq-plus" aria-hidden="true">+</span>
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="pricing-final" aria-labelledby="pricing-final-title">
          <h2 id="pricing-final-title">Bắt đầu bằng một bài học mẫu</h2>
          <p>Không cần thẻ, không tự động trừ tiền. Chỉ cần một tài khoản để lưu tiến độ.</p>
          <Link className="guest-cta" to="/register">Tạo tài khoản</Link>
        </section>
      </main>
    </div>
  );
}


