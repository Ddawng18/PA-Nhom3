import { useState } from "react";
import { Bell, BookOpen, Flame, Images } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { dashboardSamples } from "../data/dashboardSamples";
import { useDashboardData } from "../hooks/useDashboardData";
import {
  formatCourseMeta,
  formatLessonLabel,
  formatLessonProgress,
  getCurrentLessonNumber,
  getGreeting,
} from "../logic/dashboard";
import { getDisplayName, getInitials } from "../lib/userDisplay";
import { getCourseLevelLabel } from "../logic/courseEditor";
import "../styles/settings.css";
import "../styles/dashboard.css";

function getCourseLevel(level: string | null): string {
  return level ? getCourseLevelLabel(level) : "Chưa phân cấp";
}

function DisabledFeatureButton({ children, className }: { children: string; className: string }) {
  return (
    <button
      className={className}
      type="button"
      aria-disabled="true"
      title="Tính năng đang phát triển"
    >
      {children}
    </button>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [inspirationImageAvailable, setInspirationImageAvailable] = useState(true);
  const dashboard = useDashboardData(user?.id ?? null);

  if (!user) return null;

  const displayName = getDisplayName(user);
  const initials = getInitials(displayName);

  if (dashboard.loading) {
    return (
      <div className="settings-shell dash-page">
        <Sidebar user={user} displayName={displayName} initials={initials} />
        <main className="settings-main">
          <div className="dash-content">
            <p className="dash-status" role="status">Đang tải tổng quan...</p>
          </div>
        </main>
      </div>
    );
  }

  const course = dashboard.data?.course ?? null;
  const courseError = dashboard.error;
  const greeting = getGreeting(new Date());
  const nextLesson = course
    ? getCurrentLessonNumber(course.completedLessons, course.totalLessons)
    : null;
  const description = course && nextLesson !== null
    ? `Tiếp tục bài ${String(nextLesson).padStart(2, "0")} hoặc dành 5 phút luyện gesture hôm nay.`
    : "Bắt đầu một khóa học hoặc dành 5 phút luyện gesture hôm nay.";
  const lessonProgress = course
    ? formatLessonProgress(course.completedLessons, course.totalLessons)
    : null;

  return (
    <div className="settings-shell dash-page">
      <Sidebar user={user} displayName={displayName} initials={initials} />
      <main className="settings-main">
        <div className="dash-content">
          <header className="dash-header">
            <div className="dash-heading-copy">
              <h1>{greeting}, {displayName}</h1>
              <p>{description}</p>
            </div>
            <div className="dash-header-actions">
              <Link className="dash-avatar" to="/settings" aria-label="Mở cài đặt tài khoản">
                {initials}
              </Link>
              <Link className="dash-icon-button" to="/notifications" aria-label="Thông báo">
                <Bell aria-hidden="true" size={22} />
              </Link>
            </div>
          </header>

          <section className="dash-top-grid" aria-label="Hoạt động học tập">
            <article className="dash-card dash-practice-card">
              <p className="dash-eyebrow">{dashboardSamples.practice.label}</p>
              <h2>{dashboardSamples.practice.title}</h2>
              <p className="dash-practice-description">{dashboardSamples.practice.description}</p>
              <div className="dash-line-preview" aria-hidden="true">
                {[0, 1, 2].map((group) => (
                  <span className="dash-line-group" key={group}>
                    <i />
                    <i />
                    <i />
                  </span>
                ))}
              </div>
              <DisabledFeatureButton className="dash-primary-button">Bắt đầu</DisabledFeatureButton>
            </article>

            <article className={`dash-card dash-inspiration-card${inspirationImageAvailable ? "" : " dash-inspiration-fallback"}`}>
              {inspirationImageAvailable && (
                <img
                  className="dash-inspiration-image"
                  src={dashboardSamples.inspiration.image}
                  alt=""
                  aria-hidden="true"
                  onError={() => setInspirationImageAvailable(false)}
                />
              )}
              <div className="dash-inspiration-copy">
                <p>{dashboardSamples.inspiration.eyebrow}</p>
                <h2>{dashboardSamples.inspiration.title}</h2>
                <p>{dashboardSamples.inspiration.source}</p>
                <DisabledFeatureButton className="dash-inspiration-action">
                  {dashboardSamples.inspiration.action}
                </DisabledFeatureButton>
              </div>
            </article>

            <section className="dash-card dash-continue-card" aria-labelledby="dash-continue-heading">
              <h2 id="dash-continue-heading">Tiếp tục học</h2>
              {courseError ? (
                <p className="dash-data-error" role="alert">{courseError}</p>
              ) : course ? (
                <>
                  <Link className="dash-continue-link" to={`/courses/${course.id}`}>
                    <span className="dash-course-art" aria-hidden="true">
                      <span className="dash-course-art-circle" />
                      <span className="dash-course-art-path" />
                      <span className="dash-course-art-shape" />
                    </span>
                    <span className="dash-course-details">
                      <strong>{course.title}</strong>
                      <span>
                        {nextLesson === null ? "Chưa có bài học" : `${formatLessonLabel(nextLesson)} / ${course.totalLessons} · Đang học`}
                      </span>
                      <span className="dash-progress-heading">
                        <span>Tiến độ khóa học</span>
                        <span>{course.percent}%</span>
                      </span>
                      <span className="dash-progress-track" aria-hidden="true">
                        <span style={{ width: `${course.percent}%` }} />
                      </span>
                      <span className="dash-course-note">Bài học và bài luyện có hướng dẫn</span>
                    </span>
                  </Link>
                  <span className="dash-level-chip">{getCourseLevel(course.level)}</span>
                </>
              ) : (
                <div className="dash-course-empty">
                  <p>Bạn chưa ghi danh khóa học nào.</p>
                  <Link to="/my-courses">Khám phá khóa học</Link>
                </div>
              )}
            </section>
          </section>

          <section className="dash-stats-grid" aria-label="Chỉ số học tập">
            <article className="dash-card dash-stat-card">
              <Flame aria-hidden="true" size={28} />
              <strong>{dashboardSamples.streakDays}</strong>
              <span>ngày liên tiếp</span>
            </article>
            <article className="dash-card dash-stat-card">
              <BookOpen aria-hidden="true" size={28} />
              {courseError ? (
                <p className="dash-data-error" role="alert">{courseError}</p>
              ) : (
                <>
                  <strong>{dashboard.data?.completedLessonCount ?? 0}</strong>
                  <span>bài đã học</span>
                </>
              )}
            </article>
            <article className="dash-card dash-stat-card">
              <Images aria-hidden="true" size={28} />
              <strong>{dashboardSamples.savedWorks}</strong>
              <span>tác phẩm đã lưu</span>
            </article>
            <section className="dash-card dash-current-course" aria-labelledby="dash-current-course-heading">
              <div className="dash-current-course-heading">
                <h2 id="dash-current-course-heading">Khóa học đang học</h2>
                {course && <span className="dash-level-chip">{getCourseLevel(course.level)}</span>}
              </div>
              {courseError ? (
                <p className="dash-data-error" role="alert">{courseError}</p>
              ) : course ? (
                <>
                  <strong className="dash-current-course-title">{course.title}</strong>
                  <p className="dash-current-course-meta">{formatCourseMeta(course.teacherName, course.totalLessons)}</p>
                  <div className="dash-current-course-counts">
                    <span>{lessonProgress}</span>
                    <span>{nextLesson === null ? "Bài —" : formatLessonLabel(nextLesson)}</span>
                  </div>
                  <span
                    className="dash-current-progress"
                    role="progressbar"
                    aria-label="Tiến độ khóa học"
                    aria-valuenow={course.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${course.percent}%` }} />
                  </span>
                </>
              ) : (
                <div className="dash-course-empty dash-current-empty">
                  <p>Bạn chưa ghi danh khóa học nào.</p>
                  <Link to="/my-courses">Khám phá khóa học</Link>
                </div>
              )}
            </section>
          </section>

          <div className="dash-action-row">
            <DisabledFeatureButton className="dash-primary-button dash-studio-button">Vào Studio</DisabledFeatureButton>
            <DisabledFeatureButton className="dash-secondary-button">Xem tiến độ</DisabledFeatureButton>
          </div>

          <section className="dash-card dash-recent-card" aria-labelledby="dash-recent-heading">
            <div className="dash-recent-heading">
              <div>
                <h2 id="dash-recent-heading">Tác phẩm gần đây</h2>
                <p>Bài mẫu cho buổi luyện vẽ tiếp theo</p>
              </div>
            </div>
            <div className="dash-recent-grid">
              {dashboardSamples.recentWorks.map((work) => (
                <article className="dash-work-card" key={work.title}>
                  <div className={`dash-work-art dash-work-art-${work.style}`} aria-hidden="true">
                    {work.style === "line-weight" && (
                      <span className="dash-weight-lines">
                        {[1, 2, 3, 4, 5, 6].map((line) => <i key={line} />)}
                      </span>
                    )}
                    {work.style === "basic-shapes" && (
                      <span className="dash-basic-shapes">
                        <i />
                        <i />
                        <i />
                      </span>
                    )}
                    {work.style === "figure-study" && <span className="dash-figure-shape" />}
                  </div>
                  <div className="dash-work-copy">
                    <h3>{work.title}</h3>
                    <p>{work.meta}</p>
                  </div>
                </article>
              ))}
            </div>
            <p className="dash-recent-note">Các bài mẫu minh họa · vào Studio để tự tạo tác phẩm.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
