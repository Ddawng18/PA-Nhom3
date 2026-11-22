import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { getMyPortfolioUrl, getMyTeacherProfile, submitTeacherProfile, uploadPortfolio, withdrawTeacherProfile, downloadTeacherCv, removeTeacherAttachment, type TeacherApplicationDetails, type TeacherProfile } from "../lib/teacherProfileApi";
import { validatePortfolioFiles, validateTeacherProfile } from "../logic/teacherProfile";
import "../styles/settings.css";
import "../styles/teacher-onboarding.css";

const labels = { CHO_DUYET: "Đang chờ duyệt", CAN_BO_SUNG: "Cần bổ sung", DA_DUYET: "Đã được duyệt", TU_CHOI: "Đã từ chối", DA_RUT: "Đã rút hồ sơ" };

const emptyDetails: TeacherApplicationDetails = {
  cvTags: [], specialties: "", languages: "", teachingApproach: "",
};

const profileFields = [
  { key: "specialties", label: "Lĩnh vực chuyên môn", placeholder: "Ví dụ: Bố cục, màu sắc, thiết kế nhân vật", maxLength: 250 },
  { key: "languages", label: "Ngôn ngữ giảng dạy", placeholder: "Ví dụ: Tiếng Việt, tiếng Anh", maxLength: 160 },
] as const;

export default function TeacherOnboardingPage() {
  const { user, session } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [introduction, setIntroduction] = useState("");
  const [experience, setExperience] = useState("");
  const [details, setDetails] = useState(emptyDetails);
  const [cv, setCv] = useState<File>();
  const cvInput = useRef<HTMLInputElement>(null);
  const [tagInput, setTagInput] = useState("");
  const [tagError, setTagError] = useState("");
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
    if (!token) return;
    const controller = new AbortController();
    setLoading(true); setLoaded(false); setError(null);
    void getMyTeacherProfile(token, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setLoaded(true); setProfile(result); setIntroduction(result?.introduction ?? ""); setExperience(result?.experience ?? "");
      setDetails(result?.details ?? emptyDetails); setCv(undefined);
      setTagInput(""); setTagError("");
      setRetained(result?.portfolioFiles.map(file => file.filePath) ?? []); setFiles([]); uploaded.current.clear();
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error && cause.message ? cause.message : "Không thể tải hồ sơ. Vui lòng thử lại.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, attempt]);

  if (!user) return null;
  const displayName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : user.email?.split("@")[0] ?? "Học viên";
  const canEdit = loaded && !loading
    && (!profile || ["DA_RUT", "CAN_BO_SUNG"].includes(profile.status));

  const cvTags = details.cvTags ?? [];

  function addCvTag() {
    const tag = tagInput.trim().replace(/\s+/g, " ");
    if (!tag) return;
    if (cvTags.length >= 10) {
      setTagError("Bạn có thể thêm tối đa 10 thẻ.");
      return;
    }
    if (cvTags.some(value => value.toLocaleLowerCase("vi") === tag.toLocaleLowerCase("vi"))) {
      setTagError("Thẻ này đã có trong CV.");
      return;
    }
    setDetails(current => ({ ...current, cvTags: [...(current.cvTags ?? []), tag] }));
    setTagInput("");
    setTagError("");
  }

  async function withdraw() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await withdrawTeacherProfile(token);
      setProfile(current => current ? { ...current, status: "DA_RUT" } : current);
      setSuccess("Đã rút hồ sơ. Bạn có thể chỉnh sửa và gửi lại khi sẵn sàng.");
      setAttempt(value => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chưa thể rút hồ sơ. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSavedAttachment(image?: TeacherProfile["portfolioFiles"][number]) {
    if (!token || !canEdit || busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await removeTeacherAttachment(token, image?.id);
      if (image) {
        setProfile(current => current ? { ...current, portfolioFiles: current.portfolioFiles.filter(file => file.id !== image.id) } : current);
        setRetained(current => current.filter(path => path !== image.filePath));
      } else {
        setProfile(current => current ? { ...current, hasCv: false } : current);
      }
      setSuccess(image ? "Đã xóa ảnh khỏi hồ sơ." : "Đã xóa CV khỏi hồ sơ.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chưa thể xóa tệp. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

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
      await submitTeacherProfile(token, {
        introduction: introduction.trim(), experience: experience.trim(), portfolioFiles: paths, details, cv,
      });
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
      <h1>Bạn muốn làm giáo viên?</h1>
      <p>Điền thông tin giảng dạy và gửi tác phẩm để LINEA xét duyệt hồ sơ của bạn.</p>
      {loading && <p role="status">Đang tải hồ sơ...</p>}
      {success && <p className="onboarding-success" role="status">{success}</p>}
      {profile && <section className="settings-card" aria-label="Trạng thái hồ sơ">
        <h2>{labels[profile.status]}</h2>
        {profile.rejectionReason && <p>Lý do từ chối: {profile.rejectionReason}</p>}
        {profile.supplementReason && <p>Nội dung cần bổ sung: {profile.supplementReason}</p>}
        {loaded && (profile.status === "CHO_DUYET" || profile.status === "TU_CHOI") && (
          <Button type="button" variant="outline" disabled={busy} onClick={() => void withdraw()}>
            Rút hồ sơ để chỉnh sửa
          </Button>
        )}
        {profile.fields.length > 0 && <p>Trường cần sửa: {profile.fields.join(", ")}</p>}
        {profile.hasCv && token && <div className="onboarding-file">
          <Button type="button" variant="outline" onClick={() => void downloadTeacherCv(token, profile.id)
            .catch(cause => setError(cause.message))}>Tải CV đã nộp</Button>
          {canEdit && <Button type="button" variant="outline" disabled={busy}
            onClick={() => void deleteSavedAttachment()}>Xóa CV đã nộp</Button>}
        </div>}
        {profile.portfolioFiles.map(file => <div className="onboarding-file" key={file.id}>
          <Button variant="outline" type="button" onClick={() => void preview(file.id)}>Xem ảnh tác phẩm #{file.id}</Button>
          {canEdit && <Button type="button" variant="outline" disabled={busy}
            aria-label={`Xóa ảnh tác phẩm #${file.id}`}
            onClick={() => void deleteSavedAttachment(file)}>Xóa ảnh</Button>}
        </div>)}
      </section>}
      {error && <div role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Tải lại hồ sơ</button></div>}
      {loaded && !loading && <form onSubmit={event => void submit(event)} className="settings-card onboarding-form">
        <fieldset disabled={!canEdit || busy}>
          <section className="onboarding-section" aria-labelledby="teacher-info-title">
            <h2 id="teacher-info-title">Thông tin giáo viên</h2>
            <div className="onboarding-fields">
              {profileFields.map(field => (
                <FormField key={field.key} id={`onboarding-${field.key}`} label={field.label} className="settings-field">
                  <input id={`onboarding-${field.key}`} value={details[field.key] ?? ""} maxLength={field.maxLength}
                    placeholder={field.placeholder} onChange={event => setDetails(current => ({ ...current, [field.key]: event.target.value }))} />
                </FormField>
              ))}
            </div>
            <FormField id="onboarding-introduction" label="Giới thiệu bản thân" className="settings-field" required>
              <textarea id="onboarding-introduction" aria-describedby="onboarding-introduction-help" required minLength={50} maxLength={1000} rows={6} value={introduction} onChange={event => setIntroduction(event.target.value)} />
              <small id="onboarding-introduction-help">{introduction.length}/1.000 ký tự · ít nhất 50 ký tự</small>
            </FormField>
          </section>
          <section className="onboarding-section" aria-labelledby="teacher-teaching-title">
            <h2 id="teacher-teaching-title">Kinh nghiệm và phương pháp giảng dạy</h2>
            <FormField id="onboarding-experience" label="Kinh nghiệm giảng dạy và sáng tác" className="settings-field" required>
              <textarea id="onboarding-experience" aria-describedby="onboarding-experience-guide onboarding-experience-help" required minLength={10} maxLength={2000} rows={6} value={experience} onChange={event => setExperience(event.target.value)} />
              <small id="onboarding-experience-guide">Nêu lĩnh vực bạn đã dạy hoặc các dự án sáng tác đã thực hiện.</small>
              <small id="onboarding-experience-help">{experience.length}/2.000 ký tự · ít nhất 10 ký tự</small>
            </FormField>
            <FormField id="onboarding-approach" label="Phương pháp giảng dạy" className="settings-field">
              <textarea id="onboarding-approach" rows={4} maxLength={1500} value={details.teachingApproach ?? ""}
                placeholder="Bạn hướng dẫn bài vẽ và góp ý cho học viên như thế nào?"
                onChange={event => setDetails(current => ({ ...current, teachingApproach: event.target.value }))} />
            </FormField>
          </section>
          <section className="onboarding-section" aria-labelledby="teacher-docs-title">
            <h2 id="teacher-docs-title">CV và tác phẩm</h2>
            <FormField id="onboarding-cv" label="CV" className="settings-field" hint="PDF, tối đa 5 MB. Có thể bổ sung sau nếu chưa có.">
              <input ref={cvInput} id="onboarding-cv" type="file" accept=".pdf,application/pdf" aria-describedby="onboarding-cv-hint"
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (file && (!/\.pdf$/i.test(file.name) || file.size > 5 * 1024 * 1024 || file.size === 0)) {
                    event.target.value = "";
                    setCv(undefined);
                    setError("CV phải là tệp PDF tối đa 5 MB.");
                    return;
                  }
                  setError(null);
                  setCv(file);
                }} />
            </FormField>
            {cv && <div className="onboarding-file">
              <span>{cv.name}</span>
              <Button type="button" variant="outline" onClick={() => {
                if (cvInput.current) cvInput.current.value = "";
                setCv(undefined);
              }}>Xóa CV đã chọn</Button>
            </div>}
            <FormField id="onboarding-cv-tag" label="Thẻ CV" className="settings-field"
              hint="Nhập thẻ rồi nhấn Enter hoặc bấm Thêm thẻ. Tối đa 10 thẻ." error={tagError}>
              <div className="onboarding-tag-input">
                <input id="onboarding-cv-tag" value={tagInput} maxLength={30} placeholder="Ví dụ: Minh họa sách"
                  aria-describedby={tagError ? "onboarding-cv-tag-error" : "onboarding-cv-tag-hint"}
                  onChange={event => { setTagInput(event.target.value); setTagError(""); }}
                  onKeyDown={event => {
                    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                    event.preventDefault();
                    addCvTag();
                  }} />
                <Button variant="outline" type="button" disabled={!tagInput.trim()} onClick={addCvTag}>Thêm thẻ</Button>
              </div>
              {cvTags.length > 0 && <ul className="onboarding-tag-list" aria-label="Thẻ CV đã thêm">
                {cvTags.map(tag => <li key={tag}>
                  {tag}
                  {canEdit && <button type="button" aria-label={`Xóa thẻ ${tag}`} onClick={() => {
                    setDetails(current => ({ ...current, cvTags: (current.cvTags ?? []).filter(value => value !== tag) }));
                    setTagError("");
                  }}>×</button>}
                </li>)}
              </ul>}
            </FormField>
            <FormField id="onboarding-portfolio" label="Ảnh tác phẩm" className="settings-field">
              <input id="onboarding-portfolio" aria-describedby="onboarding-portfolio-help" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => {
                const selected = [...files, ...Array.from(event.target.files ?? [])];
                const message = validatePortfolioFiles(selected, retained.length);
                setError(message);
                if (!message) setFiles(selected);
                event.target.value = "";
              }} />
              <small id="onboarding-portfolio-help">Chọn 1–5 tác phẩm do bạn thực hiện. Hỗ trợ JPG, PNG và WEBP, tối đa 10 MB mỗi ảnh và 30 MB tổng.</small>
            </FormField>
            {files.length > 0 && <ul className="onboarding-selected-files">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="onboarding-file">
                  <span>{file.name} ({Math.ceil(file.size / 1024)} KB)</span>
                  <Button type="button" variant="outline" aria-label={`Xóa ảnh ${file.name}`}
                    onClick={() => setFiles(current => current.filter((_, position) => position !== index))}>Xóa ảnh</Button>
                </li>
              ))}
            </ul>}
          </section>
          <Button type="submit">{busy ? "Đang gửi hồ sơ..." : profile ? "Gửi lại hồ sơ" : "Gửi hồ sơ xét duyệt"}</Button>
        </fieldset>
      </form>}
      {profile && profile.history.length > 0 && <section className="settings-card"><h2>Lịch sử hồ sơ</h2>
        <ol>{profile.history.map((entry, index) => <li key={index}>{new Date(entry.occurredAt).toLocaleString("vi-VN")} · {labels[entry.status as keyof typeof labels] ?? entry.status}{entry.reason ? `: ${entry.reason}` : ""}</li>)}</ol>
      </section>}
    </div></main>
  </div>;
}
