import { useEffect, useState } from "react";
import { ArrowRight, Bell, BookOpen, CheckCircle2, ClipboardList, Compass, Hourglass, Palette } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import ConstructionSketch from "../components/ConstructionSketch";
import { loadAssignments, loadMyCourses, learningError, type LearnerAssignment, type MyCourse } from "../lib/learningApi";
import { getDisplayName, getInitials } from "../lib/userDisplay";
import { getDeadlineLabel } from "../logic/dashboard";
import "../styles/settings.css";
import "../styles/overview.css";

type Result<T> = { status: "loading" } | { status: "success"; data: T } | { status: "error"; message: string };

export default function DashboardPage() {
  const { user, session } = useAuth();
  const [courses, setCourses] = useState<Result<MyCourse[]>>({ status: "loading" });
  const [assignments, setAssignments] = useState<Result<LearnerAssignment[]>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const token = session?.access_token;
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setCourses({ status: "loading" }); setAssignments({ status: "loading" });
    void loadMyCourses(token, controller.signal)
      .then(data => { if (!controller.signal.aborted) setCourses({ status: "success", data }); })
      .catch(error => { if (!controller.signal.aborted) setCourses({ status: "error", message: learningError(error) }); });
    void loadAssignments(token, undefined, controller.signal)
      .then(data => { if (!controller.signal.aborted) setAssignments({ status: "success", data }); })
      .catch(error => { if (!controller.signal.aborted) setAssignments({ status: "error", message: learningError(error) }); });
    return () => controller.abort();
  }, [token, user?.id, attempt]);
  if (!user) return null;
  const name = getDisplayName(user);
  const courseItems = courses.status === "success" ? courses.data : [];
  const active = courseItems.filter(c => c.status === "DANG_HOC");
  const finished = courseItems.filter(c => c.status === "HOAN_THANH");
  const ongoing = active.filter(c => c.available).slice(0, 3);
  const featured = ongoing[0];
  const others = ongoing.slice(1);
  const workItems = assignments.status === "success" ? assignments.data : [];
  const pending = workItems.filter(a => !a.submission).sort((a, b) => (a.deadline ? Date.parse(a.deadline) : Infinity) - (b.deadline ? Date.parse(b.deadline) : Infinity));
  const reviewed = workItems.filter(a => a.submission?.grade).sort((a, b) => Date.parse(b.submission!.grade!.gradedAt) - Date.parse(a.submission!.grade!.gradedAt)).slice(0, 2);
  const waiting = workItems.filter(a => a.submission && !a.submission.grade).length;
  const error = courses.status === "error" || assignments.status === "error";
  const value = (state: Result<unknown>, n: number) => state.status === "loading" ? "…" : state.status === "error" ? "—" : String(n);

  return <div className="settings-shell overview-page"><Sidebar user={user} displayName={name} initials={getInitials(name)} />
    <main className="settings-main"><div className="overview-content">
      <div className="overview-summary">
      <header className="overview-header"><ConstructionSketch variant="summary" /><h1>Sổ học tập</h1><Link className="overview-notifications" to="/notifications" aria-label="Xem thông báo"><Bell size={20} aria-hidden="true" /></Link></header>
      <section className="overview-stats" aria-label="Tóm tắt học tập">
        <Link to="/my-courses" className="overview-stat"><span className="overview-stat-icon"><BookOpen size={20} aria-hidden="true" /></span><span><strong>{value(courses, active.length)}</strong><small>Khóa đang học</small></span><ArrowRight className="overview-stat-arrow" size={17} aria-hidden="true" /></Link>
        <Link to="/assignments" className="overview-stat"><span className="overview-stat-icon"><ClipboardList size={20} aria-hidden="true" /></span><span><strong>{value(assignments, pending.length)}</strong><small>Bài chưa nộp</small></span><ArrowRight className="overview-stat-arrow" size={17} aria-hidden="true" /></Link>
        <Link to="/assignments" className="overview-stat"><span className="overview-stat-icon"><Hourglass size={20} aria-hidden="true" /></span><span><strong>{value(assignments, waiting)}</strong><small>Bài chờ chấm</small></span><ArrowRight className="overview-stat-arrow" size={17} aria-hidden="true" /></Link>
        <Link to="/progress" className="overview-stat"><span className="overview-stat-icon"><CheckCircle2 size={20} aria-hidden="true" /></span><span><strong>{value(courses, finished.length)}</strong><small>Khóa hoàn thành</small></span><ArrowRight className="overview-stat-arrow" size={17} aria-hidden="true" /></Link>
      </section>
      </div>
      {error && <div className="overview-alert" role="alert"><span>Một phần dữ liệu chưa tải được. {courses.status === "error" ? courses.message : assignments.status === "error" ? assignments.message : ""}</span><button type="button" onClick={() => setAttempt(n => n + 1)}>Thử lại</button></div>}
      <div className="overview-grid"><div className="overview-primary">
        {courses.status === "loading" || courses.status === "error" || !featured ? <section className="overview-panel" aria-labelledby="overview-courses"><div className="overview-section-head"><div><h2 id="overview-courses">Tiếp tục học</h2></div><Link to="/my-courses">Tất cả khóa học <ArrowRight size={16} aria-hidden="true" /></Link></div>
          {courses.status === "loading" ? <p className="overview-empty" role="status">Đang tải khóa học...</p> : courses.status === "error" ? <p className="overview-empty">Chưa thể hiển thị khóa học.</p> : <div className="overview-empty"><p>{active.length ? "Khóa học của bạn hiện chưa khả dụng." : "Bạn chưa có khóa học đang học."}</p><Link className="overview-button" to="/courses">Khám phá khóa học <ArrowRight size={16} aria-hidden="true" /></Link></div>}
          </section> : <section className="overview-featured" aria-labelledby="overview-courses">
          <div className="overview-featured-top"><h2 id="overview-courses">Tiếp tục học</h2><Link className="overview-featured-all" to="/my-courses">Tất cả khóa học <ArrowRight size={16} aria-hidden="true" /></Link></div>
          <h3>{featured.title}</h3>
          <p className="overview-featured-meta">{featured.completedLessons}/{featured.totalLessons} bài học bắt buộc đã hoàn thành</p>
          <div className="overview-featured-progress"><progress value={featured.percent} max={100} aria-label={`Tiến độ ${featured.title}`} /><span>{featured.percent}%</span></div>
          <Link className="overview-featured-cta" to={`/courses/${featured.id}/learn`}>Tiếp tục học</Link>
        </section>}
        {others.length > 0 && <section className="overview-panel overview-others" aria-labelledby="overview-other-courses"><h2 className="overview-eyebrow" id="overview-other-courses">Khóa khác đang học</h2><div className="overview-course-list">{others.map(c => <article className="overview-course overview-course-compact" key={c.id}><div className="overview-course-body"><div className="overview-course-title"><h3>{c.title}</h3><span>{c.percent}%</span></div><progress value={c.percent} max={100} aria-label={`Tiến độ ${c.title}`} /></div><Link className="overview-course-link" to={`/courses/${c.id}/learn`} aria-label={`Tiếp tục học ${c.title}`}><ArrowRight size={19} aria-hidden="true" /></Link></article>)}</div></section>}
        <section className="overview-panel" aria-labelledby="overview-work"><div className="overview-section-head"><div><h2 id="overview-work">Bài luyện tập</h2></div><Link to="/assignments">Xem tất cả <ArrowRight size={16} aria-hidden="true" /></Link></div>
          {assignments.status === "loading" ? <p className="overview-empty" role="status">Đang tải bài tập...</p> : assignments.status === "error" ? <p className="overview-empty">Chưa thể hiển thị bài tập.</p> : pending.length === 0 ? <p className="overview-empty">Bạn không có bài tập chưa nộp.{waiting > 0 ? ` ${waiting} bài đang chờ chấm.` : ""}</p> : <div className="overview-work-list">{pending.slice(0, 3).map(a => { const label = getDeadlineLabel(a.deadline, new Date()); return <Link key={a.id} className="overview-work" to={`/courses/${a.courseId}/learn/${a.lessonId}`}><span className="overview-work-icon"><ClipboardList size={19} aria-hidden="true" /></span><span className="overview-work-copy"><strong>{a.lessonTitle}</strong><small>{a.deadline ? `Hạn nộp: ${new Date(a.deadline).toLocaleDateString("vi-VN")}` : "Không có hạn nộp"}</small></span><span className={`overview-work-status${label === "Đã quá hạn" ? " is-overdue" : ""}`}>{label}</span><ArrowRight size={17} aria-hidden="true" /></Link>; })}</div>}
        </section>
      </div><aside className="overview-secondary">
        <section className="overview-studio"><span className="overview-studio-icon"><Palette size={23} aria-hidden="true" /></span><h2>Studio vẽ</h2><p>Luyện nét và tải tác phẩm dưới dạng PNG.</p><Link to="/studio">Vào Studio <ArrowRight size={17} aria-hidden="true" /></Link></section>
        <section className="overview-panel overview-recent"><div className="overview-section-head"><div><h2>Nhận xét gần đây</h2></div></div>{assignments.status === "loading" ? <p className="overview-empty" role="status">Đang tải kết quả...</p> : assignments.status === "error" ? <p className="overview-empty">Chưa thể tải kết quả.</p> : reviewed.length === 0 ? <p className="overview-empty">Chưa có bài được chấm. Kết quả sẽ xuất hiện tại đây.</p> : <div className="overview-review-list">{reviewed.map(a => <Link className="overview-review" key={a.id} to={`/courses/${a.courseId}/learn/${a.lessonId}`}><strong>{a.lessonTitle}</strong><span>{a.submission!.grade!.score}/10 · {new Date(a.submission!.grade!.gradedAt).toLocaleDateString("vi-VN")}</span><small>{a.submission!.grade!.feedback}</small></Link>)}</div>}<Link className="overview-text-link" to="/assignments">Xem bài luyện tập <ArrowRight size={16} aria-hidden="true" /></Link></section>
        <section className="overview-panel overview-shortcuts"><h2>Lối tắt</h2><Link to="/courses"><Compass size={18} aria-hidden="true" /> Khám phá khóa học <ArrowRight size={16} aria-hidden="true" /></Link></section>
      </aside></div>
    </div></main>
  </div>;
}
