import { Link } from "react-router-dom";
import { demoTeachers } from "../data/demoTeachers";
import "../styles/teacher-showcase.css";

export default function TeacherShowcase() {
  return <section className="teacher-showcase" aria-labelledby="teacher-showcase-title">
    <p className="guest-section-label">HỒ SƠ GIẢNG VIÊN MINH HỌA</p>
    <h2 className="guest-section-title" id="teacher-showcase-title">Những người đồng hành mẫu</h2>
    <p className="teacher-showcase-note">Hồ sơ và số liệu dưới đây là dữ liệu minh họa cho bản thử nghiệm, không phải giáo viên thật.</p>
    <div className="teacher-showcase-grid">
      {demoTeachers.map(teacher => <article className="teacher-showcase-card" key={teacher.slug}>
        <div className={`teacher-avatar tone-${teacher.tone ?? "forest"}`} aria-hidden="true">{teacher.initials}</div>
        <div className="teacher-showcase-copy">
          <div className="teacher-showcase-title-row">
            <h3>{teacher.name}</h3>
            <span className="teacher-demo-badge">Hồ sơ mẫu</span>
          </div>
          <p className="teacher-handle">{teacher.handle} · {teacher.title}</p>
          <p className="teacher-showcase-bio">{teacher.bio[0]}</p>
          <div className="teacher-specialties">
            {teacher.specialties.slice(0, 3).map(item => <span key={item}>{item}</span>)}
          </div>
          <Link className="teacher-showcase-link" to={`/teachers/${teacher.slug}`}>Xem hồ sơ mẫu <span aria-hidden="true">→</span></Link>
        </div>
      </article>)}
    </div>
  </section>;
}
