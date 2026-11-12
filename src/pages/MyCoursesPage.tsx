import { listCourses } from "../lib/courseApi";
import { useEffect, useState } from "react";
import { Bell, BookOpen, ChevronRight, Clock3, Plus } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { getCourseLevelLabel, getCourseStatusLabel } from "../logic/courseEditor";
import { useUserRole } from "../hooks/useUserRole";
import { useStudentCourses } from "../hooks/useStudentCourses";
import type { StudentCourseStatus } from "../lib/studentCourses";
import "../styles/settings.css";
import "../styles/teacher-course.css";

type CourseTab = "all" | StudentCourseStatus;
type TeacherCourseTab = "all" | "owned";

const teacherCourseSchema = z.object({
  ma_khoa_hoc: z.union([z.string(), z.number().int().safe()]).transform(String),
  ma_giao_vien: z.string().nullable(),
  tieu_de: z.string(),
  cap_do: z.string().nullable(),
  chu_de: z.string().nullable(),
  trang_thai: z.string().nullable(),
});

type TeacherCourse = z.infer<typeof teacherCourseSchema>;

function getDisplayName(user: User): string {
  const metadataName = user.user_metadata.display_name;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }
  return user.email?.split("@")[0] || "Học viên LINEA";
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

function StudentCourses({ user, displayName }: { user: User; displayName: string }) {
  const { courses: enrolledCourses, loading, error, retry } = useStudentCourses(user.id);
  const [activeTab, setActiveTab] = useState<CourseTab>("all");
  const counts = {
    all: enrolledCourses.length,
    "in-progress": enrolledCourses.filter((course) => course.status === "in-progress").length,
    completed: enrolledCourses.filter((course) => course.status === "completed").length,
  };
  const tabs: { id: CourseTab; label: string; count: number }[] = [
    { id: "all", label: "Tất cả", count: counts.all },
    { id: "in-progress", label: "Đang học", count: counts["in-progress"] },
    { id: "completed", label: "Hoàn thành", count: counts.completed },
  ];
  const visibleCourses = activeTab === "all"
    ? enrolledCourses
    : enrolledCourses.filter((course) => course.status === activeTab);

  return (
    <div className="settings-shell">
      <Sidebar user={user} displayName={displayName} initials={getInitials(displayName)} />
      <main className="settings-main">
        <div className="settings-content">
          <header className="settings-page-heading">
            <div>
              <p className="settings-eyebrow">KHÔNG GIAN HỌC TẬP</p>
              <h1>Khóa học của tôi</h1>
              <p>Theo dõi những khóa học bạn đã đăng ký.</p>
            </div>
            <div className="settings-heading-actions">
              <Link className="button button-outline my-courses-bell" to="/notifications" aria-label="Thông báo">
                <Bell aria-hidden="true" size={18} />
              </Link>
            </div>
          </header>
          <nav className="settings-tabs" aria-label="Lọc khóa học">
            {tabs.map((tab) => (
              <button
                className={`settings-tab${activeTab === tab.id ? " active" : ""}`}
                type="button"
                aria-current={activeTab === tab.id ? "page" : undefined}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
          {loading ? <p className="settings-card" role="status">Đang tải khóa học đã đăng ký...</p>
          : error ? <section className="settings-card" aria-label="Lỗi tải khóa học">
            <p role="alert">{error}</p>
            <button className="button button-outline" type="button" onClick={retry}>Thử lại</button>
          </section>
          : visibleCourses.length === 0 && enrolledCourses.length > 0 ? (
            <p className="settings-card" role="status">
              {activeTab === "completed" ? "Bạn chưa có khóa học hoàn thành." : "Bạn chưa có khóa học đang học."}
            </p>
          ) : visibleCourses.length === 0 ? (
            <section className="my-courses-empty" aria-labelledby="my-courses-empty-title">
              <span className="my-courses-empty-icon">
                <BookOpen aria-hidden="true" size={28} />
              </span>
              <h2 id="my-courses-empty-title">Bắt đầu bộ sưu tập kiến thức của bạn</h2>
              <p>
                Những khóa học đầu tiên sẽ giúp bạn biến ý tưởng thành nét vẽ.
                Hãy chọn một chủ đề và bắt đầu hành trình sáng tạo của mình nhé.
              </p>
              <div className="my-courses-empty-actions">
                <a className="button button-primary" href="#recommended-course">
                  Khám phá khóa học
                  <ChevronRight aria-hidden="true" size={16} />
                </a>
                <a className="button button-outline" href="#recommended-course">
                  Tìm lộ trình phù hợp
                </a>
              </div>
              <p className="my-courses-empty-note">
                Bạn đã mua khóa học? <Link to="/settings">Xem thông tin tài khoản</Link>
              </p>
            </section>
          ) : (
            <section className="my-courses-list" aria-label="Khóa học đã đăng ký">
              {visibleCourses.map((course) => (
                <article className="settings-card my-courses-item" key={course.id}>
                  <BookOpen aria-hidden="true" size={20} />
                  <div className="student-course-details">
                    <h2>{course.title}</h2>
                    <p>{course.level ? `${getCourseLevelLabel(course.level)} · ` : ""}
                      {course.status === "completed" ? "Hoàn thành" : "Đang học"}
                    </p>
                  </div>
                  {course.available && <Link className="button button-outline" to="/dashboard">Xem tiến độ</Link>}
                </article>
              ))}
            </section>
          )}
          <section className="my-courses-recommendations" id="recommended-course" aria-labelledby="recommendations-title">
            <div className="my-courses-section-heading">
              <div>
                <p className="settings-eyebrow">DÀNH CHO NGƯỜI MỚI HỌC VẼ</p>
                <h2 id="recommendations-title">Một điểm bắt đầu nhẹ nhàng</h2>
              </div>
            </div>
            <article className="settings-card my-courses-recommendation">
              <div className="my-courses-course-art" aria-hidden="true">
                <BookOpen size={34} />
              </div>
              <div className="my-courses-course-info">
                <span className="my-courses-course-level">Cơ bản</span>
                <h3>Vẽ nhân vật từ hình khối cơ bản</h3>
                <p>Minh Anh · 24 bài học · 8 giờ</p>
                <span className="my-courses-course-duration">
                  <Clock3 aria-hidden="true" size={14} />
                  Học theo nhịp độ của bạn
                </span>
                <span className="course-free-chip">Miễn phí</span>
              </div>
              <a className="button button-primary my-courses-course-action" href="#recommended-course">
                Xem khóa học
                <ChevronRight aria-hidden="true" size={16} />
              </a>
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}

function TeacherCourses({ user, displayName }: { user: User; displayName: string }) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [activeTab, setActiveTab] = useState<TeacherCourseTab>("all");
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadCourses() {
      let data: unknown;
      try {
        if (!token) throw new Error("Missing session");
        data = await listCourses(token);
      } catch {
        if (isCurrent) { setLoadError("Không thể tải danh sách khóa học. Vui lòng thử lại sau."); setLoadedUserId(user.id); }
        return;
      }
      if (!isCurrent) return;

      const parsedCourses = z.array(teacherCourseSchema).safeParse(data);
      if (!parsedCourses.success) {
        setLoadError("Dữ liệu khóa học không đúng định dạng mong đợi.");
        setLoadedUserId(user.id);
        return;
      }

      setCourses(parsedCourses.data);
      setLoadError(null);
      setLoadedUserId(user.id);
    }

    setLoadedUserId(null);
    setLoadError(null);
    void loadCourses();

    return () => {
      isCurrent = false;
    };
  }, [user.id, token]);

  const loading = loadedUserId !== user.id;
  const ownedCourses = courses.filter((course) => course.ma_giao_vien === user.id);
  const visibleCourses = activeTab === "all" ? courses : ownedCourses;
  const tabs: { id: TeacherCourseTab; label: string; count: number }[] = [
    { id: "all", label: "Tất cả", count: courses.length },
    { id: "owned", label: "Khóa học của tôi", count: ownedCourses.length },
  ];

  return (
    <div className="settings-shell">
      <Sidebar user={user} displayName={displayName} initials={getInitials(displayName)} />
      <main className="settings-main">
        <div className="settings-content">
          <header className="settings-page-heading">
            <div>
              <p className="settings-eyebrow">KHÔNG GIAN HỌC TẬP</p>
              <h1>Khóa học của tôi</h1>
              <p>Một hành trình mới đang chờ nét vẽ đầu tiên của bạn.</p>
            </div>
            <div className="settings-heading-actions">
              <Link className="button button-outline my-courses-bell" to="/notifications" aria-label="Thông báo">
                <Bell aria-hidden="true" size={18} />
              </Link>
            </div>
          </header>
          <div className="teacher-course-toolbar">
            <nav className="settings-tabs" aria-label="Lọc khóa học">
              {tabs.map((tab) => (
                <button
                  className={`settings-tab${activeTab === tab.id ? " active" : ""}`}
                  type="button"
                  aria-current={activeTab === tab.id ? "page" : undefined}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
            <div className="teacher-create-action">
              <Link className="button button-primary" to="/teacher/courses/new">
                <Plus aria-hidden="true" size={16} />
                Tạo khóa học
              </Link>
            </div>
          </div>
          {loadError && <p className="settings-error" role="alert">{loadError}</p>}
          {loading ? (
            <p className="auth-loading" role="status">Đang tải khóa học...</p>
          ) : visibleCourses.length ? (
            <section className="teacher-course-list" aria-label="Danh sách khóa học">
              {visibleCourses.map((course) => {
                const isOwnedCourse = course.ma_giao_vien === user.id;
                return (
                  <article className="settings-card teacher-course-card" key={course.ma_khoa_hoc}>
                    <div className="teacher-course-card-heading">
                      <div>
                        <h2>{course.tieu_de}</h2>
                        <p>{course.cap_do ? getCourseLevelLabel(course.cap_do) : "Chưa phân cấp"} · {course.chu_de || "Chưa có chủ đề"}</p>
                      </div>
                      <span className={`teacher-course-status status-${course.trang_thai || "unknown"}`}>{course.trang_thai ? getCourseStatusLabel(course.trang_thai) : "Chưa có trạng thái"}</span>
                    </div>
                    {isOwnedCourse && (
                      <Link
                        className="teacher-course-edit"
                        to={`/teacher/courses/${encodeURIComponent(course.ma_khoa_hoc)}/edit`}
                      >
                        {course.trang_thai === "NHAP" ? "Chỉnh sửa" : "Xem"}
                      </Link>
                    )}
                  </article>
                );
              })}
            </section>
          ) : !loadError ? (
            <p className="teacher-course-empty">Chưa có khóa học nào để hiển thị.</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default function MyCoursesPage() {
  const { user } = useAuth();
  const roleState = useUserRole();

  if (!user) return null;
  if (roleState.loading) return <p className="auth-loading" role="status">Đang kiểm tra vai trò tài khoản...</p>;
  if (roleState.error) return <p className="auth-loading" role="alert">{roleState.error}</p>;

  const displayName = getDisplayName(user);
  return roleState.role === "teacher"
    ? <TeacherCourses user={user} displayName={displayName} />
    : <StudentCourses user={user} displayName={displayName} />;
}
