import { useEffect, useRef, useState } from "react";
import { createUuid } from "../logic/uuid";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import PublicHeader from "../components/PublicHeader";
import CatalogCourseCard from "../components/CatalogCourseCard";
import CourseCover from "../components/CourseCover";
import { demoTeachers } from "../data/demoTeachers";
import { getCourseFeedback, getCourseOutcomes, getCourseSample } from "../data/courseProof";
import { isDemoCourse } from "../logic/demoCourses";
import { setPageMeta } from "../lib/seo";
import { AdminApiError, AdminApiTimeoutError } from "../lib/adminApi";
import { getCatalogCourse, type CatalogDetail } from "../lib/catalogApi";
import { enrollInCourse } from "../lib/courseApi";
import { createDemoOrder, listDemoOrders, refreshZaloPayOrder, type DemoOrder } from "../lib/demoOrders";
import { learningError, loadLearningCourse, type LearningCourse } from "../lib/learningApi";
import { formatLessonCount, formatPriceLabel, formatStartDate, formatStudentCount, getInitials } from "../logic/catalog";
import { mapApiError } from "../logic/approvals";
import { getCourseLevelLabel } from "../logic/courseEditor";
import { sanitizeCoverUrl } from "../logic/publicCourses";
import "../styles/course-detail.css";

type DetailState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "success"; data: CatalogDetail };

function getLoadErrorMessage(error: unknown): string {
  if (error instanceof AdminApiTimeoutError) return error.message;
  if (error instanceof Error && error.message === "Chưa cấu hình địa chỉ máy chủ.") return error.message;
  if (error instanceof AdminApiError) return mapApiError(error.status, error.code);
  return mapApiError(0);
}

export default function CourseDetailPage() {
  const { courseId = "" } = useParams();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const token = session?.access_token;
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [learning, setLearning] = useState<LearningCourse | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [order, setOrder] = useState<DemoOrder | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const paymentDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = paymentDialogRef.current;
    if (paymentDialogOpen && dialog && !dialog.open) dialog.showModal();
    else if (!paymentDialogOpen && dialog?.open) dialog.close();
  }, [paymentDialogOpen]);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    void getCatalogCourse(courseId, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setPageMeta({
          title: `${data.khoa_hoc.tieu_de} · LINEA`,
          description: data.khoa_hoc.mo_ta || "Khóa học vẽ trên LINEA với bài học mẫu và phản hồi bài tập.",
          image: sanitizeCoverUrl(data.khoa_hoc.anh_dai_dien),
          type: "article",
        });
        setState({ status: "success", data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof AdminApiError && error.status === 404) {
          setPageMeta({ title: "Không tìm thấy khóa học · LINEA", description: "Khóa học không tồn tại hoặc chưa được đăng trên LINEA." });
          setState({ status: "not-found" });
        } else {
          setState({ status: "error", message: getLoadErrorMessage(error) });
        }
      });
    return () => controller.abort();
  }, [courseId, attempt]);

  useEffect(() => {
    setLearning(null);
    if (!token) return;
    const controller = new AbortController();
    void loadLearningCourse(token, courseId, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setLearning(data); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [token, courseId]);

  async function enroll() {
    if (!token) return;
    setBusy(true);
    setActionError("");
    try {
      await enrollInCourse(token, courseId);
      navigate(`/courses/${courseId}/learn`);
    } catch (error) {
      setActionError(learningError(error));
    } finally {
      setBusy(false);
    }
  }

  async function startDemoOrder() {
    if (!token || !user || state.status !== "success") return;
    setBusy(true); setActionError("");
    const keyName = `linea-demo-order:${user.id}:${courseId}`;
    const key = sessionStorage.getItem(keyName) ?? createUuid();
    sessionStorage.setItem(keyName, key);
    try {
      let created: DemoOrder;
      try { created = await createDemoOrder(token, state.data.khoa_hoc.ma_khoa_hoc, key); }
      catch (error) {
        if (!(error instanceof AdminApiError) || error.code !== "PAYMENT_ORDER_EXPIRED") throw error;
        const previous = (await listDemoOrders(token)).filter(item => item.courseId === state.data.khoa_hoc.ma_khoa_hoc && item.paymentProvider === "ZALOPAY_SANDBOX" && item.status === "PENDING");
        for (const oldOrder of previous) {
          let reconciled: DemoOrder;
          try { reconciled = await refreshZaloPayOrder(token, oldOrder.id); }
          catch {
            setActionError("Chưa xác minh được đơn ZaloPay cũ. Vui lòng kiểm tra trạng thái trong lịch sử thanh toán trước khi mua lại.");
            return;
          }
          if (reconciled.status === "SUCCEEDED") { navigate(`/courses/${courseId}/learn`); return; }
          if (reconciled.status === "PENDING") {
            setOrder(reconciled); setPaymentDialogOpen(true);
            setActionError("Đơn cũ vẫn đang chờ đối soát. Hệ thống chưa tạo phiên mới để tránh thanh toán trùng.");
            return;
          }
        }
        const nextKey = createUuid(); sessionStorage.setItem(keyName, nextKey);
        created = await createDemoOrder(token, state.data.khoa_hoc.ma_khoa_hoc, nextKey);
      }
      if (created.paymentUrl) {
        window.location.assign(created.paymentUrl);
        return;
      }
      if (created.status === "FAILED" || created.status === "CANCELLED") {
        const nextKey = createUuid();
        sessionStorage.setItem(keyName, nextKey);
        created = await createDemoOrder(token, state.data.khoa_hoc.ma_khoa_hoc, nextKey);
        if (created.paymentUrl) {
          window.location.assign(created.paymentUrl);
          return;
        }
      }
      if (created.status === "SUCCEEDED") navigate(`/courses/${courseId}/learn`);
      else {
        setOrder(created);
        setPaymentDialogOpen(true);
      }
    }
    catch (error) { setActionError(learningError(error)); }
    finally { setBusy(false); }
  }

  function openPaymentInfo() {
    if (order?.status === "PENDING") setPaymentDialogOpen(true);
    else void startDemoOrder();
  }

  return (
    <div className="register-page cd-page">
      <PublicHeader authLink={{ to: "/login", label: "Đăng nhập" }} />
      {state.status === "loading" && <p className="cd-status" role="status">Đang tải khóa học...</p>}
      {state.status === "not-found" && (
        <div className="cd-status">
          <p>Không tìm thấy khóa học này hoặc khóa học chưa được đăng.</p>
          <Link className="cd-button cd-button-primary" to="/courses">Về danh sách khóa học</Link>
        </div>
      )}
      {state.status === "error" && (
        <div className="cd-status" role="alert">
          <p>{state.message}</p>
          <button className="cd-button cd-button-outline" type="button" onClick={() => setAttempt((value) => value + 1)}>
            Thử lại
          </button>
        </div>
      )}
      {state.status === "success" && (() => {
        const { khoa_hoc: course, chuong: chapters, khoa_hoc_cung_chu_de: related } = state.data;
        const price = formatPriceLabel(course.gia_vnd);
        const students = formatStudentCount(course.so_hoc_vien);
        const level = getCourseLevelLabel(course.cap_do);
        const enrolled = Boolean(learning?.da_ghi_danh);
        const completed = learning?.trang_thai_ghi_danh === "HOAN_THANH";
        const teacherName = course.ten_giao_vien ?? "Giảng viên LINEA";
        const startDate = formatStartDate(course.ngay_khai_giang);
        const paid = course.gia_vnd !== null && course.gia_vnd > 0;
        const sample = getCourseSample(course, chapters[0]?.bai_hoc[0]?.tieu_de);
        const outcomes = course.ket_qua?.length ? course.ket_qua : getCourseOutcomes(course);
        const sampleFeedback = course.phan_hoi_mau || getCourseFeedback(course);
        const demoTeacher = demoTeachers.find((teacher) => teacher.name.toLocaleLowerCase("vi") === teacherName.toLocaleLowerCase("vi"));
        const primaryAction = enrolled ? (
          <Link className="cd-button cd-button-primary" to={`/courses/${courseId}/learn`}>
            {completed ? "Xem lại khóa học" : "Tiếp tục học"}
          </Link>
        ) : user && paid ? (
          <button className="cd-button cd-button-primary" type="button" disabled={busy}
            onClick={openPaymentInfo}>{busy ? "Đang xử lý..." : order?.status === "PENDING" ? "Xem thông tin thanh toán" : "Thanh toán"}</button>
        ) : user ? (
          <button className="cd-button cd-button-primary" type="button" disabled={busy}
            onClick={() => void enroll()}>
            {busy ? "Đang ghi danh..." : "Ghi danh khóa học"}
          </button>
        ) : (
          <Link className="cd-button cd-button-primary" to="/login">Đăng nhập để ghi danh</Link>
        );
        return (
          <>
            <main className="cd-main">
              <nav className="cd-breadcrumb" aria-label="Đường dẫn">
                <Link to="/courses">Khám phá</Link>
                <span aria-hidden="true">/</span>
                <span>{course.tieu_de}</span>
              </nav>

              <section className="cd-summary">
                <div className="cd-lead">
                  <div className="cd-cover">
                    <CourseCover course={course} />
                  </div>
                  <p className="cd-topic">{course.chu_de.toUpperCase()} {isDemoCourse(course) && <span className="cd-demo-badge">Khóa học mẫu</span>}</p>
                  <h1>{course.tieu_de}</h1>
                  <div className="cd-meta">
                    <span className="cd-pill">{level}</span>
                    {course.so_bai_hoc > 0 && <span>{formatLessonCount(course.so_bai_hoc)}</span>}
                    {course.so_chuong > 0 && <span>{course.so_chuong} chương</span>}
                    {students && <span>{students}</span>}
                  </div>
                  <p className="cd-description">{course.mo_ta}</p>
                  <div className="cd-instructor">
                    <span className="cd-avatar" aria-hidden="true">{getInitials(course.ten_giao_vien)}</span>
                    <div className="cd-instructor-copy">
                      <p className="cd-proof-label">GIẢNG VIÊN</p>
                      <strong>{teacherName}</strong>
                      <small>{demoTeacher ? "Hồ sơ mẫu đang hiển thị trên LINEA." : "Hồ sơ giảng viên đang được hoàn thiện cho bản thử nghiệm."}</small>
                    </div>
                    {demoTeacher && <Link className="cd-instructor-link" to={`/teachers/${demoTeacher.slug}`}>Xem hồ sơ mẫu →</Link>}
                  </div>
                </div>

                <aside className="cd-buy">
                    {price && <p className="cd-price">{price}</p>}
                    {paid && <div className="cd-payment-note">
                      <span className="cd-payment-note-icon" aria-hidden="true">✓</span>
                      <span><strong>Thanh toán thử nghiệm</strong><small>Chưa có thông tin ngân hàng để nhận tiền thật.</small></span>
                    </div>}
                    {actionError && <p className="cd-error" role="alert">{actionError}</p>}
                    {order?.status === "PENDING" && <p className="cd-order-pending-note" role="status">Đơn #{order.id} đang chờ thanh toán.</p>}
                    {primaryAction}
                    <dl className="cd-facts-list">
                      {course.so_bai_hoc > 0 && <div><dt>Số bài học</dt><dd>{formatLessonCount(course.so_bai_hoc)}</dd></div>}
                      {course.so_chuong > 0 && <div><dt>Số chương</dt><dd>{course.so_chuong} chương</dd></div>}
                      {course.thoi_luong && <div><dt>Thời lượng</dt><dd>{course.thoi_luong}</dd></div>}
                      {startDate && <div><dt>Khai giảng</dt><dd>{startDate}</dd></div>}
                    </dl>
                  <dialog className="cd-payment-dialog" ref={paymentDialogRef} aria-labelledby="cd-payment-title" aria-describedby="cd-payment-warning" onClose={() => setPaymentDialogOpen(false)}>
                    {order?.status === "PENDING" && <div className="cd-payment-dialog-content">
                      <button className="cd-payment-close" type="button" aria-label="Đóng thông tin thanh toán" onClick={() => paymentDialogRef.current?.close()}>×</button>
                      <p className="cd-topic">ĐƠN HÀNG #{order.id}</p>
                      <h2 id="cd-payment-title">Thông tin thanh toán</h2>
                      <dl className="cd-payment-details">
                        <div><dt>Khóa học</dt><dd>{order.courseTitle}</dd></div>
                        <div><dt>Số tiền</dt><dd>{order.priceVnd.toLocaleString("vi-VN")} ₫</dd></div>
                        <div><dt>Trạng thái</dt><dd>Chờ thanh toán</dd></div>
                      </dl>
                      <figure className="cd-payment-qr">
                        <img src="/payment-qr-demo.png" alt="Mã QR minh họa, không dùng để thanh toán" />
                        <figcaption>QR minh họa</figcaption>
                      </figure>
                      <p className="cd-payment-warning" id="cd-payment-warning">Mã QR này không phải mã thanh toán ngân hàng. Chưa có tài khoản nhận tiền được cấu hình; quét mã sẽ không thanh toán đơn hàng.</p>
                      <button className="cd-button cd-button-primary" type="button" onClick={() => paymentDialogRef.current?.close()}>Đã hiểu</button>
                    </div>}
                  </dialog>
                </aside>
              </section>

              <section className="cd-proof" aria-labelledby="cd-proof-title">
                <div className="cd-outcomes">
                  <p className="cd-proof-label">SAU KHÓA HỌC</p>
                  <h2 id="cd-proof-title">Bạn sẽ luyện được gì</h2>
                  <ul>
                    {outcomes.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <figure className="cd-sample" id="sample-lesson">
                  <p className="cd-proof-label">BÀI HỌC MẪU · XEM TRƯỚC</p>
                  <h2>{sample.title}</h2>
                  <p>{sample.intro}</p>
                  <div className="cd-sample-exercise">
                    <strong>Bài tập nhỏ</strong>
                    <p>{sample.exercise}</p>
                  </div>
                  <ul className="cd-sample-checklist">
                    {sample.checklist.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  <figcaption>Nội dung minh họa để xem trước; bài học đầy đủ nằm trong lớp.</figcaption>
                </figure>
                <figure className="cd-feedback">
                  <p className="cd-proof-label">VÍ DỤ PHẢN HỒI</p>
                  <blockquote>{sampleFeedback}</blockquote>
                  <figcaption>Phản hồi mẫu, không phải đánh giá bài nộp thật.</figcaption>
                </figure>
              </section>

              <div className="cd-mobile-cta">
                <div><strong>{price ?? "Miễn phí"}</strong><small>{level}</small></div>
                {primaryAction}
              </div>

              <section className="cd-content">
                <h2>NỘI DUNG KHÓA HỌC</h2>
                {chapters.length === 0 ? (
                  <p className="cd-muted">Khóa học chưa có nội dung bài học.</p>
                ) : (
                  <div className="cd-chapters">
                    {chapters.map((chapter, index) => (
                      <details className="cd-chapter" key={chapter.ma_chuong} open={index === 0}>
                        <summary>
                          <span className="cd-chapter-index">{String(index + 1).padStart(2, "0")}</span>
                          <span className="cd-chapter-title">{chapter.tieu_de}</span>
                          <span className="cd-chapter-count">{formatLessonCount(chapter.bai_hoc.length)}</span>
                        </summary>
                        {chapter.bai_hoc.length > 0 && (
                          <ul>
                            {chapter.bai_hoc.map((lesson) => <li key={lesson.ma_bai_hoc}>{lesson.tieu_de}</li>)}
                          </ul>
                        )}
                      </details>
                    ))}
                  </div>
                )}
              </section>

              {related.length > 0 && (
                <section className="cd-related" aria-label="Khóa học cùng chủ đề">
                  <h2>Khóa học cùng chủ đề</h2>
                  <div className="cd-related-grid" role="list">
                    {related.map((item) => <CatalogCourseCard key={item.ma_khoa_hoc} course={item} />)}
                  </div>
                </section>
              )}
            </main>
          </>
        );
      })()}
    </div>
  );
}
