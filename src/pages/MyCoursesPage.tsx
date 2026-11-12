import { listCourses } from "../lib/courseApi";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, BookOpen, Check, ChevronRight, LockKeyhole, PlayCircle, Plus } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Link, useNavigate } from "react-router-dom";
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

function CourseCatalogCard({
  course,
  enrolled,
  onOpen,
  onEnroll,
}: {
  course: DemoCourse;
  enrolled: boolean;
  onOpen: (courseId: string) => void;
  onEnroll: () => void;
}) {
  return (
    <article className="course-catalog-card">
      <button className="course-catalog-main" type="button" onClick={() => onOpen(course.id)}>
        <span className="course-path-card-heading">
          <span className="course-path-title">{course.title}</span>
          <span className="course-status-chip">{course.price}</span>
        </span>
        <span className="course-path-level">{course.level} · {course.lessons} bài học</span>
        <span className="course-catalog-description">{course.description}</span>
      </button>
      <div className="course-catalog-actions">
        <button className="button button-outline" type="button" onClick={() => onOpen(course.id)}>Xem chi tiết</button>
        <button className="button button-primary" type="button" disabled={enrolled} onClick={onEnroll}>
          {enrolled ? "Đã thêm" : course.price === "Miễn phí" ? "Thêm vào của tôi" : "Đăng ký"}
        </button>
      </div>
    </article>
  );
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
          {enrollmentError && <p className="settings-error" role="alert">{enrollmentError}</p>}
          <nav className="course-section-tabs" aria-label="Khu vực khóa học">
            <button className={activeSection === "mine" ? "active" : ""} type="button" onClick={() => setActiveSection("mine")}>
              Khóa học của tôi ({enrolledCourseIds.length})
            </button>
            <button className={activeSection === "discover" ? "active" : ""} type="button" onClick={() => setActiveSection("discover")}>
              Khám phá khóa học ({availableCourses.length})
            </button>
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
          {activeSection === "discover" && (
            <section className="course-catalog" aria-label="Danh mục khóa học">
              <div className="course-catalog-section">
                <div className="course-catalog-heading">
                  <div>
                    <p className="settings-eyebrow">BẮT ĐẦU TỪ CƠ BẢN</p>
                    <h2>Khóa học cơ bản miễn phí</h2>
                  </div>
                  <span>5 khóa học</span>
                </div>
                <div className="course-path-grid">
                  {availableCourses.filter((course) => course.category === "basic").map((course) => (
                    <CourseCatalogCard key={course.id} course={course} enrolled={enrolledCourseIds.includes(course.id)} onOpen={() => navigate(`/courses/${course.id}`)} onEnroll={() => void enroll(course)} />
                  ))}
                </div>
              </div>
              <div className="course-catalog-section">
                <div className="course-catalog-heading">
                  <div>
                    <p className="settings-eyebrow">ĐI XA HƠN</p>
                    <h2>Khóa học chuyên sâu</h2>
                  </div>
                  <span>Trả phí</span>
                </div>
                <div className="course-path-grid">
                  {availableCourses.filter((course) => course.category === "paid").map((course) => (
                    <CourseCatalogCard key={course.id} course={course} enrolled={enrolledCourseIds.includes(course.id)} onOpen={() => navigate(`/courses/${course.id}`)} onEnroll={() => void enroll(course)} />
                  ))}
                </div>
              </div>
            </section>
          )}
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
