import { useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { useDemoTeachers } from "../hooks/useDemoTeachers";
import { isDemoTeacherCustomized, resetAllDemoTeachers, resetDemoTeacher } from "../lib/demoTeacherStore";
import "../styles/settings.css";
import "../styles/demo-teachers.css";

function displayName(email: string | undefined, metadata: Record<string, unknown>) {
  const name = metadata.display_name;
  return typeof name === "string" && name.trim() ? name.trim() : email?.split("@")[0] || "Quản trị viên";
}

export default function AdminDemoTeachersPage() {
  const { user } = useAuth();
  const teachers = useDemoTeachers();
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null);
  if (!user) return null;

  const name = displayName(user.email, user.user_metadata);
  const customized = teachers.filter(isDemoTeacherCustomized);

  return <div className="settings-shell demo-teachers-shell">
    <Sidebar user={user} displayName={name} initials={name.slice(0, 2).toUpperCase()} />
    <main className="settings-main"><div className="settings-content">
      <header className="settings-page-heading demo-teacher-page-heading">
        <div>
          <p className="settings-eyebrow">DỮ LIỆU THỬ NGHIỆM</p>
          <h1>Hồ sơ giảng viên mẫu</h1>
          <p>Chỉnh sửa nội dung hiển thị trên trang chủ và trang hồ sơ. Đây là dữ liệu mẫu dành cho bản thử nghiệm LINEA.</p>
        </div>
        <div className="settings-heading-actions">
          <button className="button button-outline" type="button" disabled={customized.length === 0}
            onClick={() => {
              if (!window.confirm("Đặt lại toàn bộ hồ sơ mẫu về nội dung gốc?")) return;
              if (resetAllDemoTeachers()) setMessage({ text: "Đã đặt lại toàn bộ hồ sơ mẫu.", failed: false });
              else setMessage({ text: "Chưa thể đặt lại dữ liệu mẫu. Vui lòng thử lại.", failed: true });
            }}>
            <RotateCcw aria-hidden="true" size={15} /> Đặt lại tất cả
          </button>
        </div>
      </header>

      <div className="demo-teacher-admin-note" role="note">
        <Sparkles aria-hidden="true" size={16} />
        <span>Thay đổi được lưu trong trình duyệt hiện tại. Dữ liệu không tự đồng bộ sang thiết bị khác và không thay đổi hồ sơ giáo viên thật.</span>
      </div>

      {message && <p className={`demo-teacher-message${message.failed ? " demo-teacher-message-error" : ""}`} role={message.failed ? "alert" : "status"}>{message.text}</p>}

      <section className="demo-teacher-admin-grid" aria-label="Danh sách hồ sơ giảng viên mẫu">
        {teachers.map(teacher => {
          const isCustomized = isDemoTeacherCustomized(teacher);
          return <article className="demo-teacher-admin-card" key={teacher.slug}>
            <div className="demo-teacher-admin-card-heading">
              <div className={`teacher-avatar tone-${teacher.tone}`} aria-hidden="true">{teacher.initials}</div>
              <div className="demo-teacher-admin-card-title">
                <div className="demo-teacher-admin-title-row">
                  <h2>{teacher.name}</h2>
                  <span className={isCustomized ? "demo-teacher-state demo-teacher-state-edited" : "demo-teacher-state"}>
                    {isCustomized ? "Đã chỉnh sửa" : "Bản gốc"}
                  </span>
                </div>
                <p>{teacher.handle} · {teacher.title}</p>
              </div>
            </div>
            <p className="demo-teacher-admin-bio">{teacher.bio[0]}</p>
            <div className="teacher-specialties">
              {teacher.specialties.slice(0, 3).map(item => <span key={item}>{item}</span>)}
            </div>
            <div className="demo-teacher-admin-actions">
              <Link className="button button-primary" to={`/admin/demo-teachers/${teacher.slug}`}>Chỉnh sửa hồ sơ</Link>
              <Link className="button button-outline" to={`/teachers/${teacher.slug}`}>Xem công khai</Link>
              <button className="demo-teacher-reset" type="button" onClick={() => {
                if (!window.confirm(`Đặt lại hồ sơ mẫu của ${teacher.name}?`)) return;
                if (resetDemoTeacher(teacher.slug)) setMessage({ text: `Đã đặt lại hồ sơ của ${teacher.name}.`, failed: false });
                else setMessage({ text: "Chưa thể đặt lại hồ sơ. Vui lòng thử lại.", failed: true });
              }}>
                <RotateCcw aria-hidden="true" size={14} /> Đặt lại
              </button>
            </div>
          </article>;
        })}
      </section>
    </div></main>
  </div>;
}
