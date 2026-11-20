import { useEffect, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { AdminApiError, AdminApiTimeoutError } from "../lib/adminApi";
import { catalogQueryPath, listCatalogCourses, type CatalogList } from "../lib/catalogApi";
import {
  buildCatalogQuery,
  catalogLevels,
  catalogPageSize,
  catalogSorts,
  hasActiveFilters,
  parseCatalogQuery,
  toggleValue,
  type CatalogQuery,
  type CatalogSort,
} from "../logic/catalog";
import { mapApiError } from "../logic/approvals";
import { getTotalPages } from "../logic/publicCourses";
import PublicHeader from "../components/PublicHeader";
import CatalogCourseCard from "../components/CatalogCourseCard";
import "../styles/settings.css";
import "../styles/courses.css";

type CoursesResult =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: CatalogList };

function getLoadErrorMessage(error: unknown): string {
  if (error instanceof AdminApiTimeoutError) return error.message;
  if (error instanceof Error && error.message === "Chưa cấu hình địa chỉ máy chủ.") return error.message;
  if (error instanceof AdminApiError) return mapApiError(error.status, error.code);
  return mapApiError(0);
}

export default function CoursesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = parseCatalogQuery(location.search);
  const [searchValue, setSearchValue] = useState(query.search);
  const [retryCount, setRetryCount] = useState(0);
  const [result, setResult] = useState<CoursesResult>({ status: "loading" });
  const [knownTopics, setKnownTopics] = useState<CatalogList["chu_de"]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    document.title = "Khóa học · LINEA";
  }, []);

  useEffect(() => {
    setSearchValue(query.search);
  }, [query.search]);

  function go(next: CatalogQuery, replace = true) {
    navigate(catalogQueryPath(next), { replace });
  }

  useEffect(() => {
    const normalized = searchValue.trim().slice(0, 100);
    if (normalized === query.search) return;
    const timeout = window.setTimeout(() => {
      navigate(catalogQueryPath({ ...query, page: 1, search: normalized }), { replace: true });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [navigate, query, searchValue]);

  useEffect(() => {
    const canonical = catalogQueryPath(parseCatalogQuery(location.search));
    if (`${location.pathname}${location.search}` !== canonical) navigate(canonical, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const queryKey = buildCatalogQuery(query);
  useEffect(() => {
    const controller = new AbortController();
    setResult({ status: "loading" });
    void listCatalogCourses(parseCatalogQuery(`?${queryKey}`), controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        const totalPages = getTotalPages(data.totalCount, catalogPageSize);
        const current = parseCatalogQuery(`?${queryKey}`);
        if (current.page > totalPages) {
          navigate(catalogQueryPath({ ...current, page: totalPages }), { replace: true });
          return;
        }
        setKnownTopics(data.chu_de);
        setResult({ status: "success", data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({ status: "error", message: getLoadErrorMessage(error) });
      });
    return () => controller.abort();
  }, [navigate, queryKey, retryCount]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    go({ ...query, page: 1, search: searchValue });
  }

  function clearFilters() {
    setSearchValue("");
    go({ ...query, page: 1, search: "", topics: [], levels: [] });
  }

  const totalCount = result.status === "success" ? result.data.totalCount : null;
  const totalPages = totalCount === null ? 1 : getTotalPages(totalCount, catalogPageSize);
  const levelLabel = (value: string) => catalogLevels.find((item) => item.value === value)?.label ?? value;

  return (
    <div className="register-page cat-page">
      <PublicHeader authLink={{ to: "/login", label: "Đăng nhập" }} />

      <main className="cat-frame">
        <div className="cat-content">
          <header className="settings-page-heading">
            <div>
              <p className="settings-eyebrow">KHÔNG GIAN HỌC TẬP</p>
              <h1>Khóa học</h1>
              <p>Chọn khóa học phù hợp và bắt đầu hành trình vẽ của bạn.</p>
            </div>
          </header>

          <div className="cat-layout">
            <aside className={`cat-filters${filtersOpen ? " is-open" : ""}`} aria-label="Lọc khóa học">
              <div className="cat-filters-heading">
                <h2>Lọc khóa học</h2>
                <button
                  type="button"
                  className="cat-filters-toggle"
                  aria-expanded={filtersOpen}
                  aria-controls="cat-filters-body"
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  {filtersOpen ? "Thu gọn" : "Mở lọc"}
                </button>
              </div>
              <div className="cat-filters-body" id="cat-filters-body">
                <div className="cat-filter-group">
                  <fieldset>
                    <legend>CHỦ ĐỀ</legend>
                    <div className="cat-filter-list">
              {knownTopics.length === 0 && <p className="cat-filter-empty">Chưa có chủ đề nào.</p>}
              {knownTopics.map((item) => (
                        <label className="cat-check" key={item.chu_de}>
                  <input
                    type="checkbox"
                    checked={query.topics.includes(item.chu_de)}
                    onChange={() => go({ ...query, page: 1, topics: toggleValue(query.topics, item.chu_de) })}
                  />
                  <span>{item.chu_de}</span>
                  <small>{item.so_khoa_hoc}</small>
                </label>
              ))}
                    </div>
            </fieldset>
                </div>
                <div className="cat-filter-group">
                  <fieldset>
                    <legend>TRÌNH ĐỘ</legend>
                    <div className="cat-filter-list">
                {catalogLevels.map((item) => (
                        <label className="cat-check" key={item.value}>
                    <input
                      type="checkbox"
                      checked={query.levels.includes(item.value)}
                      onChange={() => go({ ...query, page: 1, levels: toggleValue(query.levels, item.value) })}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
                    </div>
              </fieldset>
                </div>
              </div>
            </aside>

            <section className="cat-results" aria-label="Danh sách khóa học">
              <div className="cat-toolbar">
                <form className="cat-search" role="search" onSubmit={submitSearch}>
                  <Search aria-hidden="true" size={16} />
                  <input
                    type="search"
                    aria-label="Tìm khóa học"
                    placeholder="Tìm theo tên khóa học"
                    maxLength={100}
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.currentTarget.value)}
                  />
                </form>
                <div className="cat-results-tools">
              <label className="cat-sort">
                <span>Sắp xếp</span>
                <select
                  value={query.sort}
                  onChange={(event) => go({ ...query, page: 1, sort: event.currentTarget.value as CatalogSort })}
                >
                  {catalogSorts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
                  <span className="cat-count" aria-live="polite">
                    {totalCount === null ? "" : `${totalCount} khóa học`}
                  </span>
            </div>
          </div>

            {hasActiveFilters(query) && (
              <div className="cat-chips">
                {query.search && (
                  <button type="button" onClick={() => { setSearchValue(""); go({ ...query, page: 1, search: "" }); }}>
                      “{query.search}” ×
                  </button>
                )}
                  {query.topics.map((topic) => (
                    <button type="button" key={topic}
                      onClick={() => go({ ...query, page: 1, topics: toggleValue(query.topics, topic) })}>
                      {topic} ×
                    </button>
                  ))}
                  {query.levels.map((level) => (
                    <button type="button" key={level}
                      onClick={() => go({ ...query, page: 1, levels: toggleValue(query.levels, level) })}>
                      {levelLabel(level)} ×
                    </button>
                  ))}
                  <button className="cat-chips-clear" type="button" onClick={clearFilters}>Xóa bộ lọc</button>
                </div>
            )}

              {result.status === "loading" && <p className="cat-status" role="status">Đang tải khóa học...</p>}
            {result.status === "error" && (
              <div className="cat-status cat-status-error" role="alert">
                <p>{result.message}</p>
                <button type="button" onClick={() => setRetryCount((count) => count + 1)}>Thử lại</button>
              </div>
            )}
            {result.status === "success" && result.data.items.length === 0 && (
              <div className="cat-status">
                <p>{hasActiveFilters(query) ? "Không có khóa học nào phù hợp với bộ lọc hiện tại." : "Chưa có khóa học nào được đăng."}</p>
                {hasActiveFilters(query) && <button type="button" onClick={clearFilters}>Xóa bộ lọc</button>}
              </div>
            )}
            {result.status === "success" && result.data.items.length > 0 && (
              <>
                <div className="cat-grid" role="list">
                  {result.data.items.map((course) => <CatalogCourseCard key={course.ma_khoa_hoc} course={course} />)}
                </div>
                {totalPages > 1 && (
                  <nav className="cat-pagination" aria-label="Phân trang khóa học">
                    <button type="button" disabled={query.page <= 1}
                      onClick={() => go({ ...query, page: query.page - 1 }, false)}>Trước</button>
                    <span>Trang {query.page} / {totalPages}</span>
                    <button type="button" disabled={query.page >= totalPages}
                      onClick={() => go({ ...query, page: query.page + 1 }, false)}>Sau</button>
                  </nav>
                )}
              </>
            )}
          </section>
          </div>
        </div>
      </main>
    </div>
  );
}
