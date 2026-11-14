import { courseRowSchema, listCourses } from "../lib/courseApi";
import { useEffect, useState } from "react";
import { Bell, Plus } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { getCourseLevelLabel, getCourseStatusLabel } from "../logic/courseEditor";
import { useUserRole } from "../hooks/useUserRole";
import { loadMyCourses, learningError, type MyCourse } from "../lib/learningApi";
import "../styles/settings.css";
import "../styles/teacher-course.css";

type CourseTab = "all" | "in-progress" | "completed";
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
  const { session } = useAuth();
  const token = session?.access_token;
  const [courses, setCourses] = useState<MyCourse[]>([]);
  const [catalog, setCatalog] = useState<z.infer<typeof courseRowSchema>[]>([]);
  const [activeTab, setActiveTab] = useState<CourseTab>("all");
  const [discover, setDiscover] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    Promise.all([loadMyCourses(token, controller.signal), listCourses(token, controller.signal)])
      .then(([mine, available]) => { if (!controller.signal.aborted) { setCourses(mine); setCatalog(available.filter(c => c.trang_thai === "DA_DANG")); } })
      .catch(e => { if (!controller.signal.aborted) setError(learningError(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, attempt]);
  const visible = courses.filter(c => activeTab === "all" || (activeTab === "completed" ? c.status === "HOAN_THANH" : c.status !== "HOAN_THANH"));
  const found = catalog.filter(c => `${c.tieu_de} ${c.chu_de}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
  return <div className="settings-shell">
    <Sidebar user={user} displayName={displayName} initials={getInitials(displayName)} />
    <main className="settings-main"><div className="settings-content">
      <header className="settings-page-heading"><div><p className="settings-eyebrow">KHÔNG GIAN HỌC TẬP</p><h1>Khóa học của tôi</h1><p>Học bài, nộp tác phẩm và theo dõi nhận xét của giáo viên.</p></div></header>
      <nav className="settings-tabs" aria-label="Khu vực khóa học">
        <button type="button" className={`settings-tab${!discover ? " active" : ""}`} onClick={() => setDiscover(false)}>Của tôi ({courses.length})</button>
        <button type="button" className={`settings-tab${discover ? " active" : ""}`} onClick={() => setDiscover(true)}>Khám phá</button>
      </nav>
      {loading ? <p role="status">Đang tải khóa học...</p> : error ? <section className="settings-card"><p role="alert">{error}</p><button className="button button-outline" onClick={() => setAttempt(v => v + 1)}>Thử lại</button></section> : discover ? <>
        <label>Tìm khóa học<input className="settings-input" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên hoặc chủ đề" /></label>
        <section className="my-courses-list" aria-label="Khóa học đã xuất bản">
          {found.length === 0 && <p>Chưa có khóa học phù hợp.</p>}
          {found.map(c => <article className="settings-card" key={c.ma_khoa_hoc}><h2>{c.tieu_de}</h2><p>{getCourseLevelLabel(c.cap_do)} · {c.chu_de}</p><p>{c.mo_ta}</p>
            <Link className="button button-primary" to={`/courses/${c.ma_khoa_hoc}`}>{courses.some(m => m.id === c.ma_khoa_hoc) ? "Vào khóa học" : "Xem và ghi danh"}</Link></article>)}
        </section>
      </> : <>
        <nav className="settings-tabs" aria-label="Lọc tiến độ">{([['all', 'Tất cả'], ['in-progress', 'Đang học'], ['completed', 'Hoàn thành']] as const).map(([id, label]) => <button type="button" key={id} className={`settings-tab${activeTab === id ? " active" : ""}`} onClick={() => setActiveTab(id)}>{label} ({courses.filter(c => id === "all" || (id === "completed" ? c.status === "HOAN_THANH" : c.status !== "HOAN_THANH")).length})</button>)}</nav>
        {visible.length === 0 && <section className="settings-card"><p>Chưa có khóa học trong mục này.</p><button className="button button-primary" onClick={() => setDiscover(true)}>Khám phá khóa học</button></section>}
        <section className="my-courses-list" aria-label="Khóa học đã ghi danh">{visible.map(c => <article className="settings-card" key={c.id}>
          <h2>{c.title}</h2><p>{getCourseLevelLabel(c.level)} · {c.status === "HOAN_THANH" ? "Đã hoàn thành" : "Đang học"}</p>
          <label>Tiến độ bài học: {c.percent}% <progress value={c.percent} max={100} /></label>
          <div>{c.available ? <Link className="button button-primary" to={`/courses/${c.id}`}>Xem tiến độ / tiếp tục học</Link> : <p>Khóa học đang tạm ẩn. Liên hệ giáo viên để được hỗ trợ.</p>}</div>
        </article>)}</section>
      </>}
    </div></main>
  </div>;
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
                    {isOwnedCourse && <Link className="button button-outline" to={`/teacher/courses/${course.ma_khoa_hoc}/submissions`}>Bài tập và chấm bài</Link>}
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
