import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { AdminApiError, AdminApiTimeoutError } from "../lib/adminApi";
import { listPublishedCourses } from "../lib/publicCourseApi";
import { getCourseLevelLabel } from "../logic/courseEditor";
import {
  buildCoursesQuery,
  formatCourseCount,
  getTotalPages,
  parseCoursesQuery,
  sanitizeCoverUrl,
  type PublicCourse,
} from "../logic/publicCourses";
import { mapApiError } from "../logic/approvals";
import PublicHeader from "../components/PublicHeader";
import "../styles/courses.css";

type CoursesResult =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; items: PublicCourse[]; totalCount: number };

function getLoadErrorMessage(error: unknown): string {
  if (error instanceof AdminApiTimeoutError) return error.message;
  if (error instanceof Error && error.message === "Chưa cấu hình địa chỉ máy chủ.") {
    return error.message;
  }
  if (error instanceof AdminApiError) return mapApiError(error.status, error.code);
  return mapApiError(0);
}

function getCoursesPath(search: string): string {
  const query = buildCoursesQuery(parseCoursesQuery(search));
  return query ? `/courses?${query}` : "/courses";
}

function CourseCard({ course }: { course: PublicCourse }) {
  const coverUrl = sanitizeCoverUrl(course.anh_dai_dien);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="course-card" role="listitem">
      {coverUrl && !imageFailed ? (
        <img
          className="course-cover"
          src={coverUrl}
          alt=""
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="course-cover-placeholder" aria-hidden="true">
          <BookOpen size={36} strokeWidth={1.7} />
        </div>
      )}
      <div className="course-card-content">
        <div className="course-badges">
          <span className="course-level-badge">{getCourseLevelLabel(course.cap_do)}</span>
          <span className="course-free-badge">Miễn phí</span>
        </div>
        <p className="course-topic">{course.chu_de}</p>
        <h2 className="course-title">{course.tieu_de}</h2>
        <p className="course-description">{course.mo_ta}</p>
        <div className="course-card-footer">
          <button
            className="course-detail-button"
            type="button"
            aria-disabled="true"
            title="Tính năng đang phát triển"
          >
            Xem chi tiết
          </button>
        </div>
      </div>
    </article>
  );
}

export default function CoursesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = parseCoursesQuery(location.search);
  const [searchValue, setSearchValue] = useState(query.search);
  const [retryCount, setRetryCount] = useState(0);
  const [result, setResult] = useState<CoursesResult>({ status: "loading" });

  useEffect(() => {
    document.title = "Khóa học · LINEA";
  }, []);

  useEffect(() => {
    setSearchValue(query.search);
  }, [query.search]);

  useEffect(() => {
    const normalizedSearch = searchValue.trim().slice(0, 100);
    if (normalizedSearch === query.search) return;
    const timeout = window.setTimeout(() => {
      const queryString = buildCoursesQuery({ page: 1, search: normalizedSearch });
      navigate(queryString ? `/courses?${queryString}` : "/courses", { replace: true });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [navigate, query.search, searchValue]);

  useEffect(() => {
    const canonicalPath = getCoursesPath(location.search);
    if (`${location.pathname}${location.search}` !== canonicalPath) {
      navigate(canonicalPath, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const controller = new AbortController();
    setResult({ status: "loading" });
    void listPublishedCourses({
      page: query.page,
      pageSize: 12,
      search: query.search,
      signal: controller.signal,
    }).then((response) => {
      if (controller.signal.aborted) return;
      const totalPages = getTotalPages(response.totalCount, 12);
      if (query.page > totalPages) {
        const queryString = buildCoursesQuery({ page: totalPages, search: query.search });
        navigate(queryString ? `/courses?${queryString}` : "/courses", { replace: true });
        return;
      }
      setResult({
        status: "success",
        items: response.items,
        totalCount: response.totalCount,
      });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setResult({ status: "error", message: getLoadErrorMessage(error) });
    });

    return () => controller.abort();
  }, [navigate, query.page, query.search, retryCount]);

  function navigateToQuery(next: { page: number; search: string }, replace = true) {
    const queryString = buildCoursesQuery(next);
    navigate(queryString ? `/courses?${queryString}` : "/courses", { replace });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigateToQuery({ page: 1, search: searchValue });
  }

  function clearSearch() {
    setSearchValue("");
    navigateToQuery({ page: 1, search: "" });
  }

  const totalPages = result.status === "success" ? getTotalPages(result.totalCount, 12) : 1;

  return (
    <div className="register-page course-page">
      <PublicHeader authLink={{ to: "/login", label: "Đăng nhập" }} />
      <main className="course-main">
        <header className="course-heading">
          <p className="course-eyebrow">KHÓA HỌC</p>
          <h1>Khóa học hiện có</h1>
          <p className="course-intro">Chọn khóa học phù hợp và bắt đầu hành trình vẽ của bạn.</p>
        </header>

        <div className="course-toolbar">
          <form className="course-search-form" role="search" onSubmit={submitSearch}>
            <label className="course-search-field">
              <Search aria-hidden="true" size={18} />
              <input
                type="search"
                aria-label="Tìm khóa học"
                placeholder="Tìm theo tên, chủ đề hoặc mô tả"
                maxLength={100}
                value={searchValue}
                onChange={(event) => setSearchValue(event.currentTarget.value)}
              />
            </label>
            {searchValue && (
              <button className="course-clear-button" type="button" onClick={clearSearch}>
                Xóa
              </button>
            )}
          </form>
          <p className="course-count" aria-live="polite">
            {result.status === "success" ? formatCourseCount(result.totalCount) : ""}
          </p>
        </div>

        <section className="course-results" aria-label="Danh sách khóa học">
          {result.status === "loading" && (
            <p className="course-status" role="status">Đang tải khóa học...</p>
          )}
          {result.status === "error" && (
            <div className="course-error" role="alert">
              <p>{result.message}</p>
              <button type="button" onClick={() => setRetryCount((count) => count + 1)}>
                Thử lại
              </button>
            </div>
          )}
          {result.status === "success" && result.items.length === 0 && query.search && (
            <div className="course-empty">
              <p>Không tìm thấy khóa học phù hợp với “{query.search}”.</p>
              <button type="button" onClick={clearSearch}>Xóa tìm kiếm</button>
            </div>
          )}
          {result.status === "success" && result.items.length === 0 && !query.search && (
            <p className="course-empty">Chưa có khóa học nào được đăng.</p>
          )}
          {result.status === "success" && result.items.length > 0 && (
            <>
              <div className="course-grid" role="list">
                {result.items.map((course) => (
                  <CourseCard
                    key={`${course.ma_khoa_hoc}-${course.anh_dai_dien ?? ""}`}
                    course={course}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <nav className="course-pagination" aria-label="Phân trang khóa học">
                  <button
                    className="course-page-button"
                    type="button"
                    disabled={query.page <= 1}
                    onClick={() => navigateToQuery({ page: query.page - 1, search: query.search }, false)}
                  >
                    Trước
                  </button>
                  <span className="course-page-indicator">Trang {query.page} / {totalPages}</span>
                  <button
                    className="course-page-button"
                    type="button"
                    disabled={query.page >= totalPages}
                    onClick={() => navigateToQuery({ page: query.page + 1, search: query.search }, false)}
                  >
                    Sau
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
