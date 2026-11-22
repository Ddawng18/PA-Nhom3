import { useEffect } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Clock3, Languages, MapPin, MessageSquareText, Pencil } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import { useDemoTeachers } from "../hooks/useDemoTeachers";
import { useUserRole } from "../hooks/useUserRole";
import "../styles/teacher-showcase.css";

export default function TeacherProfilePage() {
  const { teacherSlug } = useParams();
  const demoTeachers = useDemoTeachers();
  const teacher = demoTeachers.find(item => item.slug === teacherSlug);
  const { role } = useUserRole();

  useEffect(() => {
    document.title = teacher ? `${teacher.name} · Hồ sơ giảng viên mẫu · LINEA` : "Không tìm thấy hồ sơ · LINEA";
  }, [teacher]);

  if (!teacher) {
    return <div className="register-page teacher-profile-page">
      <PublicHeader authLink={{ to: "/login", label: "Đăng nhập" }} />
      <main className="teacher-profile-main">
        <p className="teacher-profile-eyebrow">HỒ SƠ GIẢNG VIÊN</p>
        <h1>Không tìm thấy hồ sơ mẫu</h1>
        <p>Hồ sơ này không tồn tại hoặc đã được gỡ khỏi bản thử nghiệm.</p>
        <Link className="button button-primary" to="/">Về trang chủ</Link>
      </main>
    </div>;
  }

  return <div className="register-page teacher-profile-page">
    <PublicHeader authLink={{ to: "/login", label: "Đăng nhập" }} />
    <main className="teacher-profile-main" aria-label={`Hồ sơ mẫu của ${teacher.name}`}>
      <Link className="teacher-back-link" to="/"><ArrowLeft aria-hidden="true" size={15} /> Về trang chủ</Link>

      <section className="teacher-profile-hero">
        <div className={`teacher-avatar teacher-avatar-large tone-${teacher.tone ?? "forest"}`} aria-hidden="true">{teacher.initials}</div>
        <div className="teacher-profile-heading">
          <div className="teacher-profile-kicker">
            <p className="teacher-profile-eyebrow">HỒ SƠ GIẢNG VIÊN MINH HỌA</p>
            <span className="teacher-demo-badge">Dữ liệu mẫu</span>
            {role === "admin" && <Link className="teacher-profile-edit-link" to={`/admin/demo-teachers/${teacher.slug}`}>
              <Pencil aria-hidden="true" size={13} /> Chỉnh sửa hồ sơ mẫu
            </Link>}
          </div>
          <h1>{teacher.name}</h1>
          <p className="teacher-profile-handle">{teacher.handle} · {teacher.title}</p>
          <p className="teacher-profile-location"><MapPin aria-hidden="true" size={15} /> {teacher.location}</p>
          <div className="teacher-specialties">
            {teacher.specialties.map(item => <span key={item}>{item}</span>)}
          </div>
        </div>
      </section>

      <div className="teacher-demo-notice" role="note">Đây là hồ sơ minh họa cho bản thử nghiệm LINEA. Không phải hồ sơ giáo viên thật, không phải cam kết kinh nghiệm hay dịch vụ đã được xác minh.</div>

      <div className="teacher-profile-grid">
        <div className="teacher-profile-content">
          <section className="teacher-profile-section" aria-labelledby="teacher-about">
            <p className="teacher-profile-label">GIỚI THIỆU</p>
            <h2 id="teacher-about">Cách {teacher.name} tiếp cận bài vẽ</h2>
            {teacher.bio.filter((_, index) => index === 0).map(text => <p key={text}>{text}</p>)}
          </section>

          <section className="teacher-profile-section" aria-labelledby="teacher-approach">
            <p className="teacher-profile-label">PHƯƠNG PHÁP MINH HỌA</p>
            <h2 id="teacher-approach">Phản hồi theo từng lớp</h2>
            <ul className="teacher-approach-list">
              {teacher.approach.map(item => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <section className="teacher-profile-section" aria-labelledby="teacher-portfolio">
            <p className="teacher-profile-label">DANH MỤC MINH HỌA</p>
            <h2 id="teacher-portfolio">Tác phẩm mẫu</h2>
            <div className="teacher-portfolio-grid">
              {teacher.portfolio.map(item => <article className={`teacher-portfolio-tile tone-${item.tone}`} key={item.label}>
                <span className="teacher-portfolio-index">{item.label}</span>
                <span className="teacher-portfolio-caption">{item.caption}</span>
              </article>)}
            </div>
            <p className="teacher-portfolio-note">Các ô màu là placeholder minh họa; chưa phải tác phẩm thật của giáo viên.</p>
          </section>

          <section className="teacher-profile-section" aria-labelledby="teacher-courses">
            <p className="teacher-profile-label">KHÓA HỌC MẪU</p>
            <h2 id="teacher-courses">Lớp học minh họa</h2>
            <div className="teacher-course-preview-list">
              {teacher.courses.map(course => <article className="teacher-course-preview" key={course.title}>
                <div><span className="teacher-course-level">{course.level}</span><h3>{course.title}</h3><p>{course.summary}</p></div>
                <span className="teacher-course-meta"><BookOpen aria-hidden="true" size={15} /> {course.lessons} bài</span>
              </article>)}
            </div>
            <Link className="button button-primary" to="/courses">Xem khóa học mẫu <ArrowRight aria-hidden="true" size={15} /></Link>
          </section>
        </div>

        <aside className="teacher-profile-aside">
          <section className="teacher-profile-fact-card">
            <p className="teacher-profile-label">THÔNG TIN MINH HỌA</p>
            <dl>
              <div><dt><Clock3 aria-hidden="true" size={15} /> Kinh nghiệm</dt><dd>{teacher.experience}</dd></div>
              <div><dt><Languages aria-hidden="true" size={15} /> Ngôn ngữ</dt><dd>{teacher.languages.join(", ")}</dd></div>
              <div><dt><MessageSquareText aria-hidden="true" size={15} /> Phản hồi</dt><dd>{teacher.responseTime}</dd></div>
            </dl>
            <p className="teacher-availability">{teacher.availability}</p>
          </section>
          <section className="teacher-profile-quote-card">
            <p className="teacher-profile-label">VÍ DỤ PHẢN HỒI</p>
            <blockquote>{teacher.feedbackExample}</blockquote>
            <p>Đây là mẫu phản hồi, không phải nhận xét thật của học viên.</p>
          </section>
          <Link className="button button-outline teacher-profile-back" to="/"><ArrowLeft aria-hidden="true" size={15} /> Quay lại trang chủ</Link>
        </aside>
      </div>
    </main>
  </div>;
}
