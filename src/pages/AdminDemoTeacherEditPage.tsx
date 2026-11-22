import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ExternalLink, RotateCcw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { demoTeachers, type DemoTeacher, type DemoTeacherCourse, type DemoTeacherPortfolio } from "../data/demoTeachers";
import { useDemoTeachers } from "../hooks/useDemoTeachers";
import { findStoredDemoTeacher, resetDemoTeacher, saveDemoTeacher } from "../lib/demoTeacherStore";
import "../styles/settings.css";
import "../styles/demo-teachers.css";

type DemoTeacherForm = {
  name: string;
  handle: string;
  initials: string;
  title: string;
  tone: DemoTeacher["tone"];
  location: string;
  experience: string;
  languages: string;
  specialties: string;
  bio: string;
  approach: string;
  availability: string;
  responseTime: string;
  feedbackExample: string;
  portfolio: DemoTeacherPortfolio[];
  courses: DemoTeacherCourse[];
};

const toneOptions: Array<{ value: DemoTeacher["tone"]; label: string }> = [
  { value: "forest", label: "Xanh rừng" },
  { value: "clay", label: "Đất nung" },
  { value: "indigo", label: "Xanh chàm" },
  { value: "sand", label: "Cát" },
];

function toForm(teacher: DemoTeacher): DemoTeacherForm {
  return {
    name: teacher.name,
    handle: teacher.handle,
    initials: teacher.initials,
    title: teacher.title,
    tone: teacher.tone,
    location: teacher.location,
    experience: teacher.experience,
    languages: teacher.languages.join(", "),
    specialties: teacher.specialties.join(", "),
    bio: teacher.bio.join("\n\n"),
    approach: teacher.approach.join("\n"),
    availability: teacher.availability,
    responseTime: teacher.responseTime,
    feedbackExample: teacher.feedbackExample,
    portfolio: teacher.portfolio.map(item => ({ ...item })),
    courses: teacher.courses.map(item => ({ ...item })),
  };
}

function splitList(value: string) {
  return value.split(",").map(item => item.trim()).filter(Boolean);
}

function splitParagraphs(value: string) {
  return value.split(/\n\s*\n/).map(item => item.trim()).filter(Boolean);
}

function splitLines(value: string) {
  return value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
}

function displayName(email: string | undefined, metadata: Record<string, unknown>) {
  const name = metadata.display_name;
  return typeof name === "string" && name.trim() ? name.trim() : email?.split("@")[0] || "Quản trị viên";
}

function validate(form: DemoTeacherForm) {
  if (!form.name.trim()) return "Tên hiển thị không được để trống.";
  if (!form.handle.trim()) return "Handle không được để trống.";
  if (!form.title.trim()) return "Tiêu đề chuyên môn không được để trống.";
  if (!form.location.trim()) return "Địa điểm không được để trống.";
  if (!splitList(form.languages).length) return "Cần ít nhất một ngôn ngữ.";
  if (!splitList(form.specialties).length) return "Cần ít nhất một chuyên môn.";
  if (!splitParagraphs(form.bio).length) return "Phần giới thiệu không được để trống.";
  if (!splitLines(form.approach).length) return "Cần ít nhất một bước trong phương pháp.";
  if (form.portfolio.some(item => !item.caption.trim())) return "Mỗi ô tác phẩm cần có chú thích.";
  if (form.courses.some(item => !item.title.trim())) return "Mỗi khóa học mẫu cần có tên.";
  if (form.courses.some(item => !item.summary.trim())) return "Mỗi khóa học mẫu cần có mô tả.";
  return null;
}

export default function AdminDemoTeacherEditPage() {
  const { teacherSlug } = useParams();
  const { user } = useAuth();
  const teachers = useDemoTeachers();
  const source = teachers.find(teacher => teacher.slug === teacherSlug);
  const [form, setForm] = useState<DemoTeacherForm | null>(() => {
    const initial = findStoredDemoTeacher(teacherSlug) ?? demoTeachers.find(teacher => teacher.slug === teacherSlug);
    return initial ? toForm(initial) : null;
  });
  const [feedback, setFeedback] = useState<{ text: string; failed: boolean } | null>(null);

  useEffect(() => {
    const next = findStoredDemoTeacher(teacherSlug) ?? demoTeachers.find(teacher => teacher.slug === teacherSlug);
    setForm(next ? toForm(next) : null);
    setFeedback(null);
  }, [teacherSlug]);

  useEffect(() => {
    document.title = source ? `Chỉnh sửa ${source.name} · Hồ sơ mẫu · LINEA` : "Không tìm thấy hồ sơ mẫu · LINEA";
  }, [source]);

  if (!user) return null;

  if (!source || !form) {
    return <div className="settings-shell demo-teachers-shell">
      <Sidebar user={user} displayName={displayName(user.email, user.user_metadata)} initials={displayName(user.email, user.user_metadata).slice(0, 2).toUpperCase()} />
      <main className="settings-main"><div className="settings-content">
        <Link className="teacher-back-link" to="/admin/demo-teachers"><ArrowLeft aria-hidden="true" size={15} /> Danh sách hồ sơ mẫu</Link>
        <section className="settings-card demo-teacher-missing">
          <h1>Không tìm thấy hồ sơ mẫu</h1>
          <p>Hồ sơ này không tồn tại trong bộ dữ liệu mẫu.</p>
          <Link className="button button-primary" to="/admin/demo-teachers">Quay lại danh sách</Link>
        </section>
      </div></main>
    </div>;
  }

  const name = displayName(user.email, user.user_metadata);

  function update(patch: Partial<DemoTeacherForm>) {
    setForm(current => current ? { ...current, ...patch } : current);
  }

  function updatePortfolio(index: number, patch: Partial<DemoTeacherPortfolio>) {
    setForm(current => current ? {
      ...current,
      portfolio: current.portfolio.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    } : current);
  }

  function updateCourse(index: number, patch: Partial<DemoTeacherCourse>) {
    setForm(current => current ? {
      ...current,
      courses: current.courses.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    } : current);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form || !source) return;
    const problem = validate(form);
    if (problem) {
      setFeedback({ text: problem, failed: true });
      return;
    }
    const next: DemoTeacher = {
      slug: source.slug,
      name: form.name.trim(),
      handle: form.handle.trim(),
      initials: form.initials.trim() || form.name.trim().split(/\s+/).slice(0, 2).map(part => part[0] ?? "").join("").toUpperCase(),
      title: form.title.trim(),
      tone: form.tone,
      location: form.location.trim(),
      experience: form.experience.trim(),
      languages: splitList(form.languages),
      specialties: splitList(form.specialties),
      bio: splitParagraphs(form.bio),
      approach: splitLines(form.approach),
      availability: form.availability.trim(),
      responseTime: form.responseTime.trim(),
      feedbackExample: form.feedbackExample.trim(),
      portfolio: form.portfolio.map((item, index) => ({
        label: item.label.trim() || String(index + 1).padStart(2, "0"),
        caption: item.caption.trim(),
        tone: item.tone,
      })),
      courses: form.courses.map(item => ({
        title: item.title.trim(),
        level: item.level.trim(),
        lessons: Math.max(0, Math.round(item.lessons)),
        summary: item.summary.trim(),
      })),
    };
    if (!saveDemoTeacher(next)) {
      setFeedback({ text: "Chưa thể lưu hồ sơ mẫu. Vui lòng thử lại.", failed: true });
      return;
    }
    setForm(toForm(next));
    setFeedback({ text: `Đã lưu hồ sơ mẫu của ${next.name}. Thay đổi hiển thị ngay trên trình duyệt này.`, failed: false });
  }

  function reset() {
    if (!source || !window.confirm(`Đặt lại hồ sơ mẫu của ${source.name}?`)) return;
    if (!resetDemoTeacher(source.slug)) {
      setFeedback({ text: "Chưa thể đặt lại hồ sơ. Vui lòng thử lại.", failed: true });
      return;
    }
    const seed = demoTeachers.find(teacher => teacher.slug === source.slug);
    if (seed) setForm(toForm(seed));
    setFeedback({ text: `Đã đặt lại hồ sơ của ${source.name} về nội dung gốc.`, failed: false });
  }

  return <div className="settings-shell demo-teachers-shell">
    <Sidebar user={user} displayName={name} initials={name.slice(0, 2).toUpperCase()} />
    <main className="settings-main"><div className="settings-content demo-teacher-editor-content">
      <header className="demo-teacher-editor-heading">
        <div>
          <Link className="teacher-back-link" to="/admin/demo-teachers"><ArrowLeft aria-hidden="true" size={15} /> Danh sách hồ sơ mẫu</Link>
          <p className="settings-eyebrow">DỮ LIỆU THỬ NGHIỆM</p>
          <h1>Chỉnh sửa hồ sơ mẫu</h1>
          <p>{source.name} · Các trường bên dưới cập nhật trang chủ và hồ sơ công khai ngay sau khi lưu.</p>
        </div>
        <Link className="button button-outline" to={`/teachers/${source.slug}`}>Xem công khai <ExternalLink aria-hidden="true" size={15} /></Link>
      </header>

      <div className="demo-teacher-admin-note" role="note">
        <RotateCcw aria-hidden="true" size={16} />
        <span>Dữ liệu mẫu được lưu trong trình duyệt hiện tại, không đồng bộ sang thiết bị khác. Đây không phải hồ sơ giáo viên thật.</span>
      </div>

      {feedback && <p className={`demo-teacher-message${feedback.failed ? " demo-teacher-message-error" : ""}`} role={feedback.failed ? "alert" : "status"}>{feedback.text}</p>}

      <form className="demo-teacher-editor-form" onSubmit={submit}>
        <section className="settings-card demo-teacher-form-section" aria-labelledby="demo-teacher-general">
          <div className="demo-teacher-form-section-heading"><h2 id="demo-teacher-general">Thông tin chung</h2><p>Tên, chuyên môn và thông tin nhận diện.</p></div>
          <div className="demo-teacher-form-grid">
            <FormField id="demo-teacher-name" label="Tên hiển thị" required><input id="demo-teacher-name" value={form.name} onChange={event => update({ name: event.target.value })} /></FormField>
            <FormField id="demo-teacher-handle" label="Handle" required hint="Ví dụ: @nmratist"><input id="demo-teacher-handle" value={form.handle} onChange={event => update({ handle: event.target.value })} /></FormField>
            <FormField id="demo-teacher-initials" label="Chữ viết tắt" hint="Để trống để tự tạo từ tên."><input id="demo-teacher-initials" maxLength={4} value={form.initials} onChange={event => update({ initials: event.target.value })} /></FormField>
            <FormField id="demo-teacher-title" label="Tiêu đề chuyên môn" required><input id="demo-teacher-title" value={form.title} onChange={event => update({ title: event.target.value })} /></FormField>
            <FormField id="demo-teacher-tone" label="Tông màu hồ sơ">
              <select id="demo-teacher-tone" value={form.tone} onChange={event => update({ tone: event.target.value as DemoTeacher["tone"] })}>
                {toneOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </FormField>
            <FormField id="demo-teacher-location" label="Địa điểm" required><input id="demo-teacher-location" value={form.location} onChange={event => update({ location: event.target.value })} /></FormField>
            <FormField id="demo-teacher-experience" label="Kinh nghiệm"><input id="demo-teacher-experience" value={form.experience} onChange={event => update({ experience: event.target.value })} /></FormField>
            <FormField id="demo-teacher-availability" label="Lịch phản hồi"><input id="demo-teacher-availability" value={form.availability} onChange={event => update({ availability: event.target.value })} /></FormField>
            <FormField id="demo-teacher-response" label="Thời gian phản hồi"><input id="demo-teacher-response" value={form.responseTime} onChange={event => update({ responseTime: event.target.value })} /></FormField>
          </div>
        </section>

        <section className="settings-card demo-teacher-form-section" aria-labelledby="demo-teacher-content">
          <div className="demo-teacher-form-section-heading"><h2 id="demo-teacher-content">Nội dung hồ sơ</h2><p>Giới thiệu, phương pháp và phản hồi mẫu.</p></div>
          <div className="demo-teacher-form-stack">
            <FormField id="demo-teacher-languages" label="Ngôn ngữ" required hint="Phân tách bằng dấu phẩy."><input id="demo-teacher-languages" value={form.languages} onChange={event => update({ languages: event.target.value })} /></FormField>
            <FormField id="demo-teacher-specialties" label="Chuyên môn" required hint="Phân tách bằng dấu phẩy."><input id="demo-teacher-specialties" value={form.specialties} onChange={event => update({ specialties: event.target.value })} /></FormField>
            <FormField id="demo-teacher-bio" label="Giới thiệu" required hint="Mỗi đoạn cách nhau bằng một dòng trống."><textarea id="demo-teacher-bio" rows={5} value={form.bio} onChange={event => update({ bio: event.target.value })} /></FormField>
            <FormField id="demo-teacher-approach" label="Phương pháp minh họa" required hint="Mỗi dòng là một bước."><textarea id="demo-teacher-approach" rows={5} value={form.approach} onChange={event => update({ approach: event.target.value })} /></FormField>
            <FormField id="demo-teacher-feedback" label="Ví dụ phản hồi"><textarea id="demo-teacher-feedback" rows={3} value={form.feedbackExample} onChange={event => update({ feedbackExample: event.target.value })} /></FormField>
          </div>
        </section>

        <section className="settings-card demo-teacher-form-section" aria-labelledby="demo-teacher-portfolio">
          <div className="demo-teacher-form-section-heading"><h2 id="demo-teacher-portfolio">Tác phẩm mẫu</h2><p>Chú thích và tông màu của bốn ô minh họa.</p></div>
          <div className="demo-teacher-repeat-grid">
            {form.portfolio.map((item, index) => <fieldset className="demo-teacher-repeat-card" key={index}>
              <legend>Ô {index + 1}</legend>
              <FormField id={`demo-teacher-portfolio-label-${index}`} label="Nhãn"><input id={`demo-teacher-portfolio-label-${index}`} value={item.label} onChange={event => updatePortfolio(index, { label: event.target.value })} /></FormField>
              <FormField id={`demo-teacher-portfolio-caption-${index}`} label="Chú thích" required><input id={`demo-teacher-portfolio-caption-${index}`} value={item.caption} onChange={event => updatePortfolio(index, { caption: event.target.value })} /></FormField>
              <FormField id={`demo-teacher-portfolio-tone-${index}`} label="Tông màu">
                <select id={`demo-teacher-portfolio-tone-${index}`} value={item.tone} onChange={event => updatePortfolio(index, { tone: event.target.value as DemoTeacherPortfolio["tone"] })}>
                  {toneOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </FormField>
            </fieldset>)}
          </div>
        </section>

        <section className="settings-card demo-teacher-form-section" aria-labelledby="demo-teacher-courses">
          <div className="demo-teacher-form-section-heading"><h2 id="demo-teacher-courses">Khóa học mẫu</h2><p>Thông tin hiển thị trong danh sách lớp học minh họa.</p></div>
          <div className="demo-teacher-course-form-list">
            {form.courses.map((course, index) => <fieldset className="demo-teacher-repeat-card demo-teacher-course-form" key={index}>
              <legend>Khóa học {index + 1}</legend>
              <FormField id={`demo-teacher-course-title-${index}`} label="Tên khóa học" required><input id={`demo-teacher-course-title-${index}`} value={course.title} onChange={event => updateCourse(index, { title: event.target.value })} /></FormField>
              <div className="demo-teacher-course-form-row">
                <FormField id={`demo-teacher-course-level-${index}`} label="Trình độ"><input id={`demo-teacher-course-level-${index}`} value={course.level} onChange={event => updateCourse(index, { level: event.target.value })} /></FormField>
                <FormField id={`demo-teacher-course-lessons-${index}`} label="Số bài"><input id={`demo-teacher-course-lessons-${index}`} type="number" min={0} max={999} value={course.lessons} onChange={event => updateCourse(index, { lessons: Number(event.target.value) })} /></FormField>
              </div>
              <FormField id={`demo-teacher-course-summary-${index}`} label="Mô tả" required><textarea id={`demo-teacher-course-summary-${index}`} rows={2} value={course.summary} onChange={event => updateCourse(index, { summary: event.target.value })} /></FormField>
            </fieldset>)}
          </div>
        </section>

        <div className="demo-teacher-form-actions">
          <Button type="submit">Lưu thay đổi</Button>
          <Link className="button button-outline" to="/admin/demo-teachers">Hủy</Link>
          <button className="demo-teacher-reset" type="button" onClick={reset}><RotateCcw aria-hidden="true" size={14} /> Đặt lại hồ sơ này</button>
        </div>
      </form>
    </div></main>
  </div>;
}
