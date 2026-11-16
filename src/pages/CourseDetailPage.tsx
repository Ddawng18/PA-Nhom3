import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import PublicHeader from "../components/PublicHeader";
import CatalogCourseCard from "../components/CatalogCourseCard";
import { AdminApiError, AdminApiTimeoutError } from "../lib/adminApi";
import { getCatalogCourse, type CatalogDetail } from "../lib/catalogApi";
import { enrollInCourse } from "../lib/courseApi";
import { learningError, loadLearningCourse, type LearningCourse } from "../lib/learningApi";
import { formatLessonCount, formatPriceLabel, formatStudentCount, getInitials } from "../logic/catalog";
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
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    setCoverFailed(false);
    void getCatalogCourse(courseId, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        document.title = `${data.khoa_hoc.tieu_de} · LINEA`;
        setState({ status: "success", data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof AdminApiError && error.status === 404) setState({ status: "not-found" });
        else setState({ status: "error", message: getLoadErrorMessage(error) });
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
        const coverUrl = sanitizeCoverUrl(course.anh_dai_dien);
        const price = formatPriceLabel(course.gia_vnd);
        const students = formatStudentCount(course.so_hoc_vien);
        const level = getCourseLevelLabel(course.cap_do);
        const enrolled = Boolean(learning?.da_ghi_danh);
        const completed = learning?.trang_thai_ghi_danh === "HOAN_THANH";
        const teacherName = course.ten_giao_vien ?? "Giảng viên LINEA";
        return (
          <>
            <section className="cd-hero">
              <div className="cd-hero-inner">
                <p className="cd-hero-eyebrow">{course.chu_de.toUpperCase()} · LINEA</p>
                <h1>{course.tieu_de}</h1>
                <div className="cd-hero-meta">
                  <span className="cd-pill">{level}</span>
                  {course.so_bai_hoc > 0 && <span>{formatLessonCount(course.so_bai_hoc)}</span>}
                  {course.so_chuong > 0 && <span>{course.so_chuong} chương</span>}
                  {students && <span>{students}</span>}
                </div>
              </div>
            </section>

            <main className="cd-main">
              <nav className="cd-breadcrumb" aria-label="Đường dẫn">
                <Link to="/courses">Khám phá</Link>
                <span aria-hidden="true">/</span>
                <span>{course.tieu_de}</span>
              </nav>

              <section className="cd-summary">
                <div className="cd-cover">
                  {coverUrl && !coverFailed ? (
                    <img src={coverUrl} alt="" onError={() => setCoverFailed(true)} />
                  ) : (
                    <span aria-hidden="true">{course.tieu_de.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="cd-info">
                  <p className="cd-topic">{course.chu_de.toUpperCase()}</p>
                  <h2>{course.tieu_de}</h2>
                  <p className="cd-description">{course.mo_ta}</p>
                  <p className="cd-facts">
                    <span className="cd-pill">{level}</span>
                    <span>{teacherName}</span>
                  </p>

                  <div className="cd-buy">
                    {price && <p className="cd-price">{price}</p>}
                    {enrolled && learning && (
                      <label className="cd-progress">
                        Tiến độ: {learning.phan_tram}%
                        <progress value={learning.phan_tram} max={100} />
                      </label>
                    )}
                    {actionError && <p className="cd-error" role="alert">{actionError}</p>}
                    {enrolled ? (
                      <Link className="cd-button cd-button-primary" to={`/courses/${courseId}/learn`}>
                        {completed ? "Xem lại khóa học" : "Tiếp tục học"}
                      </Link>
                    ) : user ? (
                      <button className="cd-button cd-button-primary" type="button" disabled={busy}
                        onClick={() => void enroll()}>
                        {busy ? "Đang ghi danh..." : "Ghi danh khóa học"}
                      </button>
                    ) : (
                      <Link className="cd-button cd-button-primary" to="/login">Đăng nhập để ghi danh</Link>
                    )}
                  </div>
                </div>
              </section>

              <section className="cd-columns">
                <article className="cd-card">
                  <h3>NỘI DUNG KHÓA HỌC</h3>
                  {chapters.length === 0 ? (
                    <p className="cd-muted">Khóa học chưa có nội dung bài học.</p>
                  ) : (
                    <ol className="cd-chapters">
                      {chapters.map((chapter, index) => (
                        <li key={chapter.ma_chuong}>
                          <span className="cd-chapter-index">{String(index + 1).padStart(2, "0")}</span>
                          <div>
                            <strong>{chapter.tieu_de}</strong>
                            <small>{formatLessonCount(chapter.bai_hoc.length)}</small>
                            {chapter.bai_hoc.length > 0 && (
                              <ul>
                                {chapter.bai_hoc.map((lesson) => <li key={lesson.ma_bai_hoc}>{lesson.tieu_de}</li>)}
                              </ul>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </article>

                <article className="cd-card cd-teacher">
                  <h3>GIẢNG VIÊN</h3>
                  <div className="cd-teacher-row">
                    <span className="cd-avatar" aria-hidden="true">{getInitials(course.ten_giao_vien)}</span>
                    <div>
                      <strong>{teacherName}</strong>
                      <small>Giảng viên khóa học</small>
                    </div>
                  </div>
                </article>
              </section>

              {related.length > 0 && (
                <section className="cd-related" aria-label="Khóa học cùng chủ đề">
                  <h3>Khóa học cùng chủ đề</h3>
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
