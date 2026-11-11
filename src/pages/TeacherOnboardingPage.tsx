import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useUserRole } from "../hooks/useUserRole";
import Sidebar from "../components/Sidebar";
import { getMyPortfolioUrl, getMyTeacherProfile, submitTeacherProfile, uploadPortfolio, type TeacherProfile } from "../lib/teacherProfileApi";
import { validatePortfolioFiles, validateTeacherProfile } from "../logic/teacherProfile";
import "../styles/settings.css";
import "../styles/teacher-onboarding.css";

const labels = { CHO_DUYET: "Đang chờ duyệt", CAN_BO_SUNG: "Cần bổ sung", DA_DUYET: "Đã được duyệt", TU_CHOI: "Đã từ chối" };

export default function TeacherOnboardingPage() {
  const { user, session } = useAuth();
  const role = useUserRole();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [introduction, setIntroduction] = useState("");
  const [experience, setExperience] = useState("");
  const [retained, setRetained] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const uploaded = useRef(new Map<File, string>());
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const token = session?.access_token;

  useEffect(() => {
    if (!token || role.loading || role.role === "admin") return;
    const controller = new AbortController();
    setLoading(true); setLoaded(false); setError(null);
    void getMyTeacherProfile(token, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setLoaded(true); setProfile(result); setIntroduction(result?.introduction ?? ""); setExperience(result?.experience ?? "");
      setRetained(result?.portfolioFiles.map(file => file.filePath) ?? []); setFiles([]); uploaded.current.clear();
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error && cause.message ? cause.message : "Không thể tải hồ sơ. Vui lòng thử lại.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, role.loading, role.role, attempt]);

  if (!user) return null;
  const displayName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : user.email?.split("@")[0] ?? "Học viên";
  const canEdit = loaded && !loading && !role.loading && !role.error && role.role === "student"
    && (!profile || ["TU_CHOI", "CAN_BO_SUNG"].includes(profile.status));

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!token || !canEdit || busy) return;
    const problem = validateTeacherProfile(introduction, experience, retained.length + files.length)
      ?? validatePortfolioFiles(files, retained.length);
    if (problem) { setError(problem); return; }
    setBusy(true); setError(null); setSuccess(null);
    try {
      const paths = [...retained];
      for (const file of files) {
        let path = uploaded.current.get(file);
        if (!path) { path = (await uploadPortfolio(token, file)).filePath; uploaded.current.set(file, path); }
        paths.push(path);
      }
      await submitTeacherProfile(token, introduction.trim(), experience.trim(), paths);
      // Lock immediately: a failed refresh must not allow a second submission.
      setProfile(current => current ? { ...current, status: "CHO_DUYET" } : {
        id: 0, userId: user!.id, introduction, experience, status: "CHO_DUYET", rejectionReason: null,
        supplementReason: null, fields: [], portfolioFiles: [], history: [],
      });
      setSuccess("Hồ sơ đã được gửi. Bạn có thể theo dõi kết quả tại trang này.");
      setAttempt(value => value + 1);
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : "Chưa thể gửi hồ sơ. Vui lòng thử lại.");
    } finally { setBusy(false); }
  }

  async function preview(id: number) {
    if (!token) return;
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    try { const url = await getMyPortfolioUrl(token, id); if (tab) tab.location.href = url; }
    catch { tab?.close(); setError("Không thể mở ảnh tác phẩm. Vui lòng thử lại."); }
  }

  return <div className="settings-layout">
    <Sidebar user={user} displayName={displayName} initials={displayName.slice(0, 2).toUpperCase()} />
    <main className="settings-main"><div className="onboarding-content">
      <h1>Trở thành giáo viên LINEA</h1>
      <p>Giới thiệu kinh nghiệm và chia sẻ tác phẩm của bạn để được xét duyệt giảng dạy.</p>
      {(loading || role.loading) && role.role !== "admin" && <p role="status">Đang tải hồ sơ...</p>}
      {role.error && <p role="alert">{role.error}</p>}
      {role.role === "admin" ? <p>Quản trị viên duyệt hồ sơ tại <Link to="/admin/teachers">trang phê duyệt</Link>.</p> : <>
        {success && <p className="onboarding-success" role="status">{success}</p>}
        {profile && <section className="settings-card" aria-label="Trạng thái hồ sơ">
          <h2>{labels[profile.status]}</h2>
          {profile.rejectionReason && <p>Lý do từ chối: {profile.rejectionReason}</p>}
          {profile.supplementReason && <p>Nội dung cần bổ sung: {profile.supplementReason}</p>}
          {profile.fields.length > 0 && <p>Trường cần sửa: {profile.fields.join(", ")}</p>}
          {profile.status === "DA_DUYET" && <Link to="/teacher/courses/new">Tạo khóa học</Link>}
          {profile.portfolioFiles.map(file => <div className="onboarding-file" key={file.id}>
            <button className="button button-outline" type="button" onClick={() => void preview(file.id)}>Xem ảnh tác phẩm #{file.id}</button>
            {canEdit && retained.includes(file.filePath) && <button type="button" disabled={busy} onClick={() => setRetained(values => values.filter(path => path !== file.filePath))}>Gỡ khỏi lần gửi lại</button>}
          </div>)}
        </section>}
        {error && <div role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Tải lại hồ sơ</button></div>}
        {!loading && !role.loading && <form onSubmit={event => void submit(event)} className="settings-card onboarding-form">
          <fieldset disabled={!canEdit || busy}>
            <label className="settings-field"><span>Giới thiệu bản thân</span>
              <textarea required minLength={50} maxLength={1000} rows={6} value={introduction} onChange={event => setIntroduction(event.target.value)} />
              <small>{introduction.length}/1.000 ký tự · ít nhất 50 ký tự</small>
            </label>
            <label className="settings-field"><span>Kinh nghiệm giảng dạy và sáng tác</span>
              <textarea required minLength={10} maxLength={2000} rows={6} value={experience} onChange={event => setExperience(event.target.value)} />
              <small>{experience.length}/2.000 ký tự · ít nhất 10 ký tự</small>
            </label>
            <label className="settings-field"><span>Ảnh tác phẩm</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => {
                const selected = Array.from(event.target.files ?? []);
                const message = validatePortfolioFiles(selected, retained.length);
                setError(message); if (!message) setFiles(selected);
              }} />
              <small>1–5 ảnh JPG/PNG/WEBP; tối đa 10 MB/ảnh và 30 MB tổng.</small>
            </label>
            <ul>{files.map((file, index) => <li key={`${file.name}-${index}`}>{file.name} ({Math.ceil(file.size / 1024)} KB)</li>)}</ul>
            <button className="button button-primary" type="submit">{busy ? "Đang gửi hồ sơ..." : profile ? "Gửi lại hồ sơ" : "Gửi hồ sơ xét duyệt"}</button>
          </fieldset>
        </form>}
        {profile && profile.history.length > 0 && <section className="settings-card"><h2>Lịch sử hồ sơ</h2>
          <ol>{profile.history.map((entry, index) => <li key={index}>{new Date(entry.occurredAt).toLocaleString("vi-VN")} · {labels[entry.status as keyof typeof labels] ?? entry.status}{entry.reason ? `: ${entry.reason}` : ""}</li>)}</ol>
        </section>}
      </>}
    </div></main>
  </div>;
}
