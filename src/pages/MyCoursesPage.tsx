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
import { supabase } from "../lib/supabase";
import "../styles/settings.css";
import "../styles/teacher-course.css";

type CourseStatus = "in-progress" | "completed";

type EnrolledCourse = {
  id: string;
  title: string;
  status: CourseStatus;
};

type TeacherCourseTab = "all" | "owned";

type DemoCourse = EnrolledCourse & {
  category: "basic" | "paid";
  level: string;
  teacher: string;
  lessons: number;
  completedLessons: number;
  description: string;
  modules: string[];
  price: string;
};

const availableCourses: DemoCourse[] = [
  {
    id: "line-control",
    title: "Kiểm soát nét",
    category: "basic",
    status: "in-progress",
    level: "Cơ bản",
    teacher: "Minh Anh",
    lessons: 12,
    completedLessons: 0,
    description: "Làm chủ nét vẽ, lực tay và nhịp điệu để nét nào cũng có chủ đích.",
    modules: ["Làm quen với nét", "Nét thẳng và đường cong", "Bài tập kiểm soát lực tay", "Tổng hợp và thực hành"],
    price: "Miễn phí",
  },
  {
    id: "shape-form",
    title: "Hình khối và dựng hình",
    category: "basic",
    status: "in-progress",
    level: "Cơ bản",
    teacher: "Minh Anh",
    lessons: 16,
    completedLessons: 0,
    description: "Từ hình khối đơn giản đến cách dựng vật thể có chiều sâu.",
    modules: ["Hình khối cơ bản", "Phối hợp hình khối", "Sáng tối và thể tích", "Dựng vật thể hoàn chỉnh"],
    price: "Miễn phí",
  },
  {
    id: "perspective-space",
    title: "Phối cảnh và không gian",
    category: "basic",
    status: "in-progress",
    level: "Trung cấp",
    teacher: "Hà Linh",
    lessons: 14,
    completedLessons: 0,
    description: "Hiểu phối cảnh để tạo ra những không gian cân bằng và có chiều sâu.",
    modules: ["Đường chân trời", "Một điểm tụ", "Hai điểm tụ", "Bài tập không gian"],
    price: "Miễn phí",
  },
  {
    id: "light-color",
    title: "Ánh sáng và sắc độ",
    category: "basic",
    status: "in-progress",
    level: "Trung cấp",
    teacher: "Hà Linh",
    lessons: 10,
    completedLessons: 0,
    description: "Quan sát ánh sáng và chuyển nó thành sắc độ rõ ràng trong tranh.",
    modules: ["Nguồn sáng", "Sắc độ căn bản", "Bóng đổ", "Bài tập tĩnh vật"],
    price: "Miễn phí",
  },
  {
    id: "character-design",
    title: "Nhân vật và nét viền",
    category: "basic",
    status: "in-progress",
    level: "Cơ bản",
    teacher: "Minh Anh",
    lessons: 18,
    completedLessons: 0,
    description: "Xây dựng nhân vật có cá tính từ hình dáng, tỷ lệ và nét viền.",
    modules: ["Tỷ lệ nhân vật", "Dáng và cử chỉ", "Nét viền có chủ đích", "Bài tập nhân vật"],
    price: "Miễn phí",
  },
  {
    id: "gesture-masterclass",
    title: "Gesture và dáng chuyển động",
    category: "paid",
    status: "in-progress",
    level: "Nâng cao",
    teacher: "Minh Anh",
    lessons: 20,
    completedLessons: 0,
    description: "Nắm bắt chuyển động và nhịp điệu để nhân vật có sức sống tự nhiên.",
    modules: ["Quan sát chuyển động", "Đường hành động", "Dáng người", "Bài tập gesture"],
    price: "299.000đ",
  },
  {
    id: "digital-color",
    title: "Màu kỹ thuật số cho minh họa",
    category: "paid",
    status: "in-progress",
    level: "Trung cấp",
    teacher: "Hà Linh",
    lessons: 15,
    completedLessons: 0,
    description: "Xây dựng bảng màu và hoàn thiện một minh họa kỹ thuật số.",
    modules: ["Bảng màu", "Ánh sáng màu", "Chất liệu", "Hoàn thiện minh họa"],
    price: "399.000đ",
  },
];

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
  const navigate = useNavigate();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [courseProgress, setCourseProgress] = useState<Record<string, number>>({});
  const [activeSection, setActiveSection] = useState<"mine" | "discover">("mine");
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(true);
  const selectedCourse = availableCourses.find((course) => course.id === selectedCourseId);

  useEffect(() => {
    let active = true;

    async function loadEnrollments() {
      if (!supabase) {
        if (active) {
          setEnrollmentError("Ứng dụng chưa được cấu hình Supabase.");
          setEnrollmentsLoading(false);
        }
        return;
      }

      const { data: enrollments, error } = await supabase
        .from("ghi_danh")
        .select("ma_khoa_hoc")
        .eq("ma_nguoi_dung", user.id)
        .eq("trang_thai", "DANG_HOC");
      if (error) {
        if (active) {
          setEnrollmentError("Không thể tải khóa học đã thêm.");
          setEnrollmentsLoading(false);
        }
        return;
      }

      const courseIds = (enrollments ?? []).map((row) => row.ma_khoa_hoc);
      if (!courseIds.length) {
        if (active) {
          setEnrolledCourseIds([]);
          setCourseProgress({});
          setEnrollmentError(null);
          setEnrollmentsLoading(false);
        }
        return;
      }

      const { data: courses, error: coursesError } = await supabase
        .from("khoa_hoc")
        .select("ma_khoa_hoc, tieu_de")
        .in("ma_khoa_hoc", courseIds);
      if (coursesError) {
        if (active) {
          setEnrollmentError("Không thể tải thông tin khóa học đã thêm.");
          setEnrollmentsLoading(false);
        }
        return;
      }

      const titles = new Set((courses ?? []).map((course) => course.tieu_de));
      const courseIdByTitle = new Map((courses ?? []).map((course) => [course.tieu_de, String(course.ma_khoa_hoc)]));
      const chapterIdsByCourseId = new Map<string, string[]>();
      const { data: chapterRows, error: chapterError } = await supabase
        .from("chuong")
        .select("ma_chuong, ma_khoa_hoc")
        .in("ma_khoa_hoc", courseIds);
      if (chapterError) {
        if (active) {
          setEnrollmentError("Không thể tải nội dung khóa học.");
          setEnrollmentsLoading(false);
        }
        return;
      }
      (chapterRows ?? []).forEach((row) => {
        const key = String(row.ma_khoa_hoc);
        chapterIdsByCourseId.set(key, [...(chapterIdsByCourseId.get(key) ?? []), String(row.ma_chuong)]);
      });

      const chapterIds = (chapterRows ?? []).map((row) => row.ma_chuong);
      const { data: lessonRows, error: lessonError } = chapterIds.length
        ? await supabase.from("bai_hoc").select("ma_bai_hoc, ma_chuong").in("ma_chuong", chapterIds)
        : { data: [], error: null };
      if (lessonError) {
        if (active) {
          setEnrollmentError("Không thể tải bài học của khóa học.");
          setEnrollmentsLoading(false);
        }
        return;
      }
      const chapterToCourseId = new Map<string, string>();
      chapterIdsByCourseId.forEach((ids, courseId) => ids.forEach((id) => chapterToCourseId.set(id, courseId)));
      const lessonToCourseId = new Map<string, string>();
      (lessonRows ?? []).forEach((row) => {
        const courseId = chapterToCourseId.get(String(row.ma_chuong));
        if (courseId) lessonToCourseId.set(String(row.ma_bai_hoc), courseId);
      });

      const { data: progressRows, error: progressError } = await supabase
        .from("tien_do_bai_hoc")
        .select("ma_bai_hoc")
        .eq("ma_nguoi_dung", user.id)
        .eq("trang_thai", "DA_HOAN_THANH");
      if (progressError) {
        if (active) {
          setEnrollmentError("Không thể tải tiến độ khóa học.");
          setEnrollmentsLoading(false);
        }
        return;
      }
      const totalByCourseId: Record<string, number> = {};
      lessonToCourseId.forEach((courseId) => { totalByCourseId[courseId] = (totalByCourseId[courseId] ?? 0) + 1; });
      const completedByCourseId: Record<string, number> = {};
      (progressRows ?? []).forEach((row) => {
        const courseId = lessonToCourseId.get(String(row.ma_bai_hoc));
        if (courseId) completedByCourseId[courseId] = (completedByCourseId[courseId] ?? 0) + 1;
      });
      const progressByDemoId: Record<string, number> = {};
      availableCourses.forEach((course) => {
        const courseId = courseIdByTitle.get(course.title);
        const total = courseId ? totalByCourseId[courseId] ?? 0 : 0;
        const completed = courseId ? completedByCourseId[courseId] ?? 0 : 0;
        progressByDemoId[course.id] = total ? Math.round(completed / total * 100) : 0;
      });
      if (active) {
        setEnrolledCourseIds(availableCourses
          .filter((course) => titles.has(course.title))
          .map((course) => course.id));
        setCourseProgress(progressByDemoId);
        setEnrollmentError(null);
        setEnrollmentsLoading(false);
      }
    }

    void loadEnrollments();
    return () => {
      active = false;
    };
  }, [user.id]);

  async function enroll(course: DemoCourse) {
    if (!supabase) {
      setEnrollmentError("Ứng dụng chưa được cấu hình Supabase.");
      return;
    }

    const { data: courseRow, error: courseError } = await supabase
      .from("khoa_hoc")
      .select("ma_khoa_hoc")
      .eq("tieu_de", course.title)
      .eq("trang_thai", "DA_DANG")
      .maybeSingle();
    if (courseError || !courseRow) {
      setEnrollmentError("Không tìm thấy khóa học trên Supabase.");
      return;
    }

    const { error } = await supabase.from("ghi_danh").upsert({
      ma_nguoi_dung: user.id,
      ma_khoa_hoc: courseRow.ma_khoa_hoc,
      trang_thai: "DANG_HOC",
      ngay_ghi_danh: new Date().toISOString(),
    }, { onConflict: "ma_nguoi_dung,ma_khoa_hoc" });
    if (error) {
      setEnrollmentError("Không thể lưu khóa học vào Supabase.");
      return;
    }

    setEnrolledCourseIds((ids) => ids.includes(course.id) ? ids : [...ids, course.id]);
    setActiveSection("mine");
    setEnrollmentError(null);
  }

  if (selectedCourse) {
    const isEnrolled = enrolledCourseIds.includes(selectedCourse.id);
    const progress = isEnrolled ? courseProgress[selectedCourse.id] ?? 0 : 0;
    return (
      <div className="settings-shell">
        <Sidebar user={user} displayName={displayName} initials={getInitials(displayName)} />
        <main className="settings-main">
          <div className="settings-content course-detail">
            <button className="course-back-button" type="button" onClick={() => setSelectedCourseId(null)}>
              <ArrowLeft aria-hidden="true" size={16} /> Lộ trình học
            </button>
            <header className="course-detail-heading">
              <div>
                <p className="settings-eyebrow">LỘ TRÌNH HỌC / BÀI HỌC</p>
                <h1>{selectedCourse.title}</h1>
                <p>{selectedCourse.description}</p>
              </div>
              <Link className="button button-outline my-courses-bell" to="/notifications" aria-label="Thông báo">
                <Bell aria-hidden="true" size={18} />
              </Link>
            </header>
            <div className="course-detail-meta">
              <span className="course-status-chip in-progress">{isEnrolled ? "Đang học" : selectedCourse.price}</span>
              <span>{selectedCourse.teacher} · {selectedCourse.lessons} bài học · {selectedCourse.level}</span>
            </div>
            <section className="course-detail-hero" aria-label="Tiến độ khóa học">
              <div className="course-detail-hero-art"><PlayCircle aria-hidden="true" size={42} /></div>
              <div className="course-detail-hero-copy">
                <span>Bài học tiếp theo</span>
                <h2>{selectedCourse.modules[Math.min(selectedCourse.completedLessons, selectedCourse.modules.length - 1)]}</h2>
                <p>{selectedCourse.completedLessons} / {selectedCourse.lessons} bài học đã hoàn thành</p>
                <div className="course-progress-track"><span style={{ width: `${progress}%` }} /></div>
              </div>
              <button
                className="button button-primary"
                type="button"
                disabled={isEnrolled}
                onClick={() => void enroll(selectedCourse)}
              >
                {isEnrolled ? "Mở bài học" : selectedCourse.price === "Miễn phí" ? "Thêm vào khóa học của tôi" : "Đăng ký khóa học"}
                <ChevronRight aria-hidden="true" size={16} />
              </button>
            </section>
            <div className="course-detail-grid">
              <section className="course-module-card" aria-labelledby="course-modules-title">
                <h2 id="course-modules-title">Lộ trình trong khóa</h2>
                <div className="course-module-list">
                  {selectedCourse.modules.map((module, index) => {
                    const moduleDone = isEnrolled && index < Math.ceil(selectedCourse.completedLessons / 4);
                    return (
                      <div className={`course-module${moduleDone ? " done" : ""}`} key={module}>
                        <span className="course-module-number">{String(index + 1).padStart(2, "0")}</span>
                        <span><strong>{module}</strong><small>{moduleDone ? "Đã hoàn thành" : "Chưa bắt đầu"}</small></span>
                        {moduleDone ? <Check aria-label="Đã hoàn thành" size={15} /> : <LockKeyhole aria-label="Chưa mở khóa" size={14} />}
                      </div>
                    );
                  })}
                </div>
              </section>
              <aside className="course-detail-side-card">
                <h2>Mục tiêu bài học</h2>
                <ul>
                  <li>Hiểu các nguyên tắc cốt lõi</li>
                  <li>Thực hành qua bài tập ngắn</li>
                  <li>Tự tin áp dụng vào tác phẩm</li>
                </ul>
              </aside>
            </div>
            <section className="course-resource-card">
              <h2>Tài liệu & tài nguyên</h2>
              <p><Check aria-hidden="true" size={14} /> Tư thế tham khảo · mẫu nét</p>
              <p><Check aria-hidden="true" size={14} /> Bài tập PDF · hướng dẫn thực hành</p>
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="settings-shell">
      <Sidebar user={user} displayName={displayName} initials={getInitials(displayName)} />
      <main className="settings-main">
        <div className="settings-content">
          <header className="settings-page-heading">
            <div>
              <p className="settings-eyebrow">{activeSection === "mine" ? "KHÔNG GIAN HỌC TẬP" : "KHÁM PHÁ NỘI DUNG"}</p>
              <h1>{activeSection === "mine" ? "Khóa học của tôi" : "Khám phá khóa học"}</h1>
              <p>{activeSection === "mine" ? "Các khóa học bạn đã thêm sẽ xuất hiện ở đây." : "Chọn một khóa học để xem chi tiết và bắt đầu học."}</p>
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
          {activeSection === "mine" && enrollmentsLoading && (
            <p className="auth-loading" role="status">Đang tải khóa học của bạn...</p>
          )}
          {activeSection === "mine" && !enrollmentsLoading && enrolledCourseIds.length === 0 && (
            <section className="course-empty-state">
              <BookOpen aria-hidden="true" size={30} />
              <h2>Bạn chưa có khóa học nào</h2>
              <p>Khám phá các khóa học cơ bản miễn phí hoặc chọn khóa học trả phí phù hợp với mục tiêu của bạn.</p>
              <button className="button button-primary" type="button" onClick={() => setActiveSection("discover")}>
                Khám phá khóa học <ChevronRight aria-hidden="true" size={15} />
              </button>
            </section>
          )}
          {activeSection === "mine" && !enrollmentsLoading && enrolledCourseIds.length > 0 && (
            <section className="course-path-grid" aria-label="Khóa học của tôi">
            {availableCourses.filter((course) => enrolledCourseIds.includes(course.id)).map((course) => {
              const progress = courseProgress[course.id] ?? 0;
              const statusLabel = progress === 100 ? "Hoàn thành" : "Đang học";
              return (
                <button className={`course-path-card ${course.status}`} type="button" key={course.id} onClick={() => navigate(`/courses/${course.id}`)}>
                  <span className="course-path-card-heading">
                    <span className="course-path-title">{course.title}</span>
                    <span className="course-status-chip">{statusLabel}</span>
                  </span>
                  <span className="course-path-level">{course.level}</span>
                  <span className="course-path-progress-label">{course.status === "in-progress" ? `Tiến độ khóa học · ${progress}%` : "Đã khóa · 0%"}</span>
                  <span className="course-progress-track"><span style={{ width: `${progress}%` }} /></span>
                  <span className="course-path-footer">{course.status === "in-progress" ? "Bài học và bài tập có hướng dẫn" : "Cần hoàn thành bài tiên quyết"}</span>
                  <ChevronRight className="course-path-arrow" aria-hidden="true" size={17} />
                </button>
              );
            })}
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
