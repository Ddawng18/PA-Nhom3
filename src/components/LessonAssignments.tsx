import { useEffect, useState } from "react";
import { learningError, loadAssignments, submitAssignment, type LearnerAssignment } from "../lib/learningApi";
import SubmissionImage from "./SubmissionImage";

export function AssignmentCard({ assignment, token, onSaved }: { assignment: LearnerAssignment; token: string; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const deadlinePassed = Boolean(assignment.deadline && Date.parse(assignment.deadline) < Date.now());
  const graded = assignment.submission?.grade;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file || busy) return;
    const form = e.currentTarget;
    setBusy(true); setError(""); setMessage("");
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024 || file.size === 0)
        throw new Error("Chọn ảnh JPG, PNG hoặc WEBP, tối đa 10 MB.");
      await submitAssignment(token, assignment.id, file);
      setFile(null); form.reset(); setMessage("Đã nộp bài. Giáo viên sẽ nhận được thông báo."); onSaved();
    } catch (err) { setError(learningError(err)); }
    finally { setBusy(false); }
  }
  return <article className="settings-card assignment-card">
    <h3>Bài tập #{assignment.id} {assignment.required ? "· Bắt buộc" : "· Tự chọn"}</h3>
    <p className="learning-text">{assignment.prompt}</p>
    <p>{assignment.deadline ? `Hạn nộp: ${new Date(assignment.deadline).toLocaleString("vi-VN")}` : "Không giới hạn hạn nộp"}</p>
    {assignment.submission && <><p>Đã nộp: {new Date(assignment.submission.updatedAt).toLocaleString("vi-VN")} · {graded ? "Đã chấm" : "Chờ chấm"}</p>
      <SubmissionImage key={`${assignment.submission.id}:${assignment.submission.updatedAt}`} token={token} id={assignment.submission.id} /></>}
    {graded ? <section aria-label="Kết quả chấm"><h4>Điểm: {graded.score}/10</h4><p className="learning-text">{graded.feedback}</p><p>Chấm lúc {new Date(graded.gradedAt).toLocaleString("vi-VN")}</p></section>
      : deadlinePassed ? <p>Đã hết hạn nộp bài.</p> : <form onSubmit={e => void submit(e)}>
        <label>Ảnh bài tập (JPG/PNG/WEBP, tối đa 10 MB)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} required onChange={e => { setFile(e.target.files?.[0] ?? null); setError(""); setMessage(""); }} /></label>
        {preview && <img className="assignment-preview" src={preview} alt="Ảnh đã chọn để nộp" />}
        <button type="submit" className="button button-primary" disabled={busy || !file}>{busy ? "Đang nộp..." : assignment.submission ? "Nộp lại ảnh" : "Nộp bài"}</button>
        <p>Có thể thay ảnh trước hạn, khi giáo viên chưa chấm.</p>
      </form>}
    {error && <p className="settings-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  </article>;
}

export default function LessonAssignments({ token, lessonId, onChanged }: { token: string; lessonId: number; onChanged: () => void }) {
  const [rows, setRows] = useState<LearnerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    void loadAssignments(token, lessonId, controller.signal).then(data => { if (!controller.signal.aborted) setRows(data); })
      .catch(e => { if (!controller.signal.aborted) setError(learningError(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, lessonId, attempt]);
  return <section aria-label="Bài tập của bài học"><h2>Bài tập và nhận xét</h2>
    {loading ? <p role="status">Đang tải bài tập...</p> : error ? <><p role="alert">{error}</p><button onClick={() => setAttempt(v => v + 1)}>Thử lại</button></>
      : rows.length === 0 ? <p>Bài học này chưa có bài tập.</p>
      : rows.map(a => <AssignmentCard key={a.id} assignment={a} token={token} onSaved={() => { setAttempt(v => v + 1); onChanged(); }} />)}
  </section>;
}
