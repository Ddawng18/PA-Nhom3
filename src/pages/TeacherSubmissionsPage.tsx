import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import SubmissionImage from "../components/SubmissionImage";
import { requestAdminApi } from "../lib/adminApi";
import { getCourse } from "../lib/courseApi";
import { loadTeacherWork, saveGrade, learningError, type TeacherWork } from "../lib/learningApi";
import "../styles/settings.css";
import "../styles/learning.css";

function GradeCard({ row, token, prompt, onSaved }: { row: TeacherWork["submissions"][number]; token: string; prompt: string; onSaved: () => void }) {
  const [score, setScore] = useState(String(row.grade?.score ?? ""));
  const [feedback, setFeedback] = useState(row.grade?.feedback ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { await saveGrade(token, row, Number(score), feedback); onSaved(); }
    catch (err) { setError(learningError(err)); }
    finally { setBusy(false); }
  }
  return <article className="settings-card assignment-card">
    <h2>Bài nộp #{row.id} · {row.grade ? "Đã chấm" : "Chờ chấm"}</h2><p className="learning-text">{prompt}</p>
    <p>Học viên: {row.studentId}</p><p>Cập nhật: {new Date(row.updatedAt).toLocaleString("vi-VN")}</p>
    <SubmissionImage token={token} id={row.id} />
    <form onSubmit={e => void submit(e)}>
      <label>Điểm / 10<input type="number" min={0} max={10} step="0.01" required disabled={busy} value={score} onChange={e => setScore(e.target.value)} /></label>
      <label>Nhận xét<textarea required maxLength={2000} disabled={busy} value={feedback} onChange={e => setFeedback(e.target.value)} /></label>
      <button className="button button-primary" disabled={busy || !feedback.trim()}>{busy ? "Đang lưu..." : row.grade ? "Lưu điểm và nhận xét mới" : "Chấm bài"}</button>
      {row.grade && <p>Mỗi lần thay đổi điểm/nhận xét đều được lưu vào lịch sử.</p>}
      {error && <p className="settings-error" role="alert">{error} Bạn có thể bấm tải lại danh sách để lấy bản mới nhất.</p>}
    </form>
  </article>;
}

export default function TeacherSubmissionsPage() {
  const { user, session } = useAuth(); const token = session?.access_token;
  const { courseId = "" } = useParams();
  const [data, setData] = useState<TeacherWork | null>(null);
  const [title, setTitle] = useState(""); const [draft, setDraft] = useState(false);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0); const [filter, setFilter] = useState("waiting");
  const [message, setMessage] = useState(""); const [creating, setCreating] = useState(false);
  const [prompt, setPrompt] = useState(""); const [lessonId, setLessonId] = useState("");
  const [deadline, setDeadline] = useState(""); const [required, setRequired] = useState(true);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController(); setLoading(true); setError("");
    void Promise.all([loadTeacherWork(token, courseId, controller.signal), getCourse(token, courseId, controller.signal)])
      .then(([work, course]) => { if (!controller.signal.aborted) { setData(work); setTitle(course.tieu_de); setDraft(course.trang_thai === "NHAP"); } })
      .catch(e => { if (!controller.signal.aborted) setError(learningError(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, courseId, attempt]);
  if (!user || !token) return null;
  async function create(e: React.FormEvent) {
    e.preventDefault(); setCreating(true); setError("");
    try {
      await requestAdminApi("/api/assignments/teacher", { token: token!, method: "POST", body: { lessonId: Number(lessonId), prompt,
        deadline: deadline ? new Date(deadline).toISOString() : null, required } });
      setPrompt(""); setDeadline(""); setMessage("Đã thêm bài tập."); setAttempt(v => v + 1);
    } catch (err) { setError(learningError(err)); } finally { setCreating(false); }
  }
  const rows = data?.submissions.filter(s => filter === "all" || (filter === "graded" ? s.grade !== null : s.grade === null)) ?? [];
  return <div className="settings-shell"><Sidebar user={user} displayName="Giáo viên" initials="GV" />
    <main className="settings-main"><div className="settings-content learning-content">
      <Link to="/my-courses">← Khóa học của tôi</Link><h1>Bài tập và chấm bài</h1><h2>{title}</h2>
      <button className="button button-outline" onClick={() => setAttempt(v => v + 1)}>Tải lại danh sách</button>
      {message && <p role="status">{message}</p>}{error && <p role="alert" className="settings-error">{error}</p>}
      {loading ? <p role="status">Đang tải...</p> : data && <>
        <section className="settings-card assignment-card"><h2>Bài tập ({data.assignments.length})</h2>
          {data.assignments.length === 0 ? <p>Chưa có bài tập.</p> : data.assignments.map(a => <div key={a.id}><h3>#{a.id} · {data.lessons.find(l => l.id === a.lessonId)?.title}</h3><p className="learning-text">{a.prompt}</p><p>{a.required ? "Bắt buộc" : "Tự chọn"} · {a.deadline ? new Date(a.deadline).toLocaleString("vi-VN") : "Không hạn nộp"}</p></div>)}
          {draft && <form onSubmit={e => void create(e)}><h3>Thêm bài tập vào khóa nháp</h3>
            <label>Bài học<select required value={lessonId} onChange={e => setLessonId(e.target.value)}><option value="">Chọn bài học</option>{data.lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></label>
            <label>Đề bài<textarea required maxLength={10000} value={prompt} onChange={e => setPrompt(e.target.value)} /></label>
            <label>Hạn nộp (bỏ trống nếu không giới hạn)<input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} /></label>
            <label><input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} />Bài tập bắt buộc</label>
            <button className="button button-primary" disabled={creating || !lessonId || !prompt.trim()}>{creating ? "Đang lưu..." : "Thêm bài tập"}</button>
          </form>}
        </section>
        <nav className="settings-tabs" aria-label="Lọc bài nộp">{[["waiting", "Chờ chấm"], ["graded", "Đã chấm"], ["all", "Tất cả"]].map(([id, label]) => <button type="button" key={id} className={`settings-tab${filter === id ? " active" : ""}`} onClick={() => setFilter(id)}>{label} ({data.submissions.filter(s => id === "all" || (id === "graded" ? s.grade !== null : s.grade === null)).length})</button>)}</nav>
        {rows.length === 0 && <p>Chưa có bài nộp trong mục này.</p>}
        {rows.map(s => <GradeCard key={`${s.id}:${s.updatedAt}:${s.grade?.gradedAt ?? ""}`} token={token} row={s} prompt={data.assignments.find(a => a.id === s.assignmentId)?.prompt ?? ""} onSaved={() => { setMessage("Đã lưu điểm và gửi thông báo cho học viên."); setAttempt(v => v + 1); }} />)}
      </>}
    </div></main>
  </div>;
}
