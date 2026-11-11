import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { getCourseLevelLabel } from "../logic/courseEditor";
import {
  formatDateVi,
  mapTeacherStatus,
  rejectionCodeLabels,
  rejectionCodes,
  validateRejectCode,
  validateRejectReason,
  type ApprovalSection,
} from "../logic/approvals";
import { useApprovals } from "../hooks/useApprovals";
import "../styles/approvals.css";

type ApprovalData = ReturnType<typeof useApprovals>;
type DialogAction = "approve-teacher" | "reject-teacher" | "approve-course" | "reject-course";
type PendingDialog = {
  action: DialogAction;
  id: number;
  name: string;
  opener: HTMLButtonElement;
};

const statusOptions = [
  ["CHO_DUYET", "Đang chờ duyệt"],
  ["CAN_BO_SUNG", "Cần bổ sung"],
  ["DA_DUYET", "Đã duyệt"],
  ["TU_CHOI", "Bị từ chối"],
];

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

function ApprovalDialog({
  pending,
  onClose,
  onConfirm,
}: {
  pending: PendingDialog;
  onClose: () => void;
  onConfirm: (reasonCode: string, reason: string) => Promise<string | null>;
}) {
  const isReject = pending.action === "reject-teacher" || pending.action === "reject-course";
  const isTeacher = pending.action === "approve-teacher" || pending.action === "reject-teacher";
  const isApprove = !isReject;
  const [reasonCode, setReasonCode] = useState("");
  const [reason, setReason] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const firstControl = dialogRef.current?.querySelector<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])"
    );
    firstControl?.focus();
    return () => {
      window.requestAnimationFrame(() => pending.opener.focus());
    };
  }, [pending.opener]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!processing) onClose();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const controls = [...dialogRef.current.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])"
    )];
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestError(null);
    if (isReject) {
      const nextReasonError = validateRejectReason(reason);
      setReasonError(nextReasonError);
      if (isTeacher) {
        const nextCodeError = validateRejectCode(reasonCode);
        setCodeError(nextCodeError);
        if (nextReasonError || nextCodeError) return;
      } else if (nextReasonError) {
        return;
      }
    }

    setProcessing(true);
    const result = await onConfirm(reasonCode, reason.trim());
    setProcessing(false);
    if (result) setRequestError(result);
  }

  const title = isApprove
    ? isTeacher ? `Duyệt hồ sơ của ${pending.name}?` : `Duyệt đăng khóa học '${pending.name}'?`
    : isTeacher ? `Từ chối hồ sơ của ${pending.name}` : `Từ chối khóa học '${pending.name}'`;
  const description = isApprove
    ? isTeacher ? "Người này sẽ trở thành giáo viên." : "Khóa học sẽ hiển thị công khai."
    : isTeacher
      ? "Nội dung sẽ được gửi tới người nộp. Từ 10 đến 500 ký tự."
      : "Nhập lý do từ chối từ 10 đến 500 ký tự.";

  return (
    <div className="appr-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !processing) onClose();
    }}>
      <div
        className="appr-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="appr-dialog-title"
        ref={dialogRef}
        onKeyDown={handleKeyDown}
      >
        <form onSubmit={submit}>
          <h2 id="appr-dialog-title">{title}</h2>
          <p className="appr-dialog-description">{description}</p>
          {isReject && isTeacher && (
            <label className="appr-field">
              <span>Lý do từ chối <strong>*</strong></span>
              <select
                value={reasonCode}
                onChange={(event) => {
                  setReasonCode(event.target.value);
                  setCodeError(null);
                }}
                aria-invalid={Boolean(codeError)}
                aria-describedby={codeError ? "appr-code-error" : undefined}
                disabled={processing}
              >
                <option value="">Chọn lý do</option>
                {rejectionCodes.map((code) => (
                  <option value={code} key={code}>{rejectionCodeLabels[code]}</option>
                ))}
              </select>
              {codeError && <span className="appr-field-error" id="appr-code-error">{codeError}</span>}
            </label>
          )}
          {isReject && (
            <label className="appr-field">
              <span>Giải thích chi tiết <strong>*</strong></span>
              <textarea
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setReasonError(null);
                }}
                maxLength={600}
                rows={5}
                aria-invalid={Boolean(reasonError)}
                aria-describedby={`appr-reason-help appr-reason-count${reasonError ? " appr-reason-error" : ""}`}
                disabled={processing}
              />
              <span className="appr-field-help" id="appr-reason-help">{description}</span>
              <span className="appr-reason-count" id="appr-reason-count">{reason.trim().length}/500</span>
              {reasonError && <span className="appr-field-error" id="appr-reason-error">{reasonError}</span>}
            </label>
          )}
          {requestError && <p className="appr-dialog-error" role="alert">{requestError}</p>}
          <div className="appr-dialog-actions">
            <button className="appr-button appr-button-quiet" type="button" disabled={processing} onClick={onClose}>
              Hủy
            </button>
            <button className="appr-button appr-button-primary" type="submit" disabled={processing}>
              {processing ? "Đang xử lý..." : "Xác nhận"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TeacherRow({
  item,
  data,
  onDialog,
}: {
  item: ApprovalData["teacherItems"][number];
  data: ApprovalData;
  onDialog: (action: DialogAction, id: number, name: string, opener: HTMLButtonElement) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const name = item.displayName?.trim() || item.email || "Giáo viên LINEA";
  const detail = data.details[item.id];
  const status = mapTeacherStatus(item.status);

  useEffect(() => {
    const expirations = detail?.portfolioFiles
      .map((file) => data.signedUrls[file.id]?.expiresAt)
      .filter((expiresAt): expiresAt is string => Boolean(expiresAt))
      .map((expiresAt) => new Date(expiresAt).getTime())
      .filter((expiresAt) => expiresAt > currentTime) ?? [];
    if (!expirations.length) return;
    const timeout = window.setTimeout(
      () => setCurrentTime(Date.now()),
      Math.max(0, Math.min(...expirations) - currentTime)
    );
    return () => window.clearTimeout(timeout);
  }, [currentTime, data.signedUrls, detail]);

  function toggleDetails() {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail) void data.loadTeacherDetail(item.id);
  }

  return (
    <article className="appr-teacher-row">
      <span className="appr-avatar" aria-hidden="true">{getInitials(name) || "G"}</span>
      <div className="appr-row-main">
        <div className="appr-person-copy">
          <strong>{name}</strong>
          {item.email && <span>{item.email}</span>}
          <span>Gửi ngày {formatDateVi(item.submittedAt)}</span>
        </div>
        <span className={`appr-status appr-status-${status.tone}`}>{status.label}</span>
        <div className="appr-row-actions">
          <button className="appr-button appr-button-quiet" type="button" aria-expanded={expanded} onClick={toggleDetails}>
            {expanded ? "Ẩn hồ sơ" : "Xem hồ sơ"}
          </button>
          {item.status === "CHO_DUYET" && (
            <>
              <button
                className="appr-button appr-button-primary"
                type="button"
                onClick={(event) => onDialog("approve-teacher", item.id, name, event.currentTarget)}
              >
                Duyệt
              </button>
              <button
                className="appr-button appr-button-secondary"
                type="button"
                onClick={(event) => onDialog("reject-teacher", item.id, name, event.currentTarget)}
              >
                Từ chối
              </button>
            </>
          )}
        </div>
      </div>
      {expanded && (
        <div className="appr-expanded">
          {data.detailErrors[item.id] && (
            <div className="appr-detail-error" role="alert">
              <span>{data.detailErrors[item.id]}</span>
              <button className="appr-button appr-button-quiet" type="button" onClick={() => void data.loadTeacherDetail(item.id)}>
                Thử lại
              </button>
            </div>
          )}
          {!detail && !data.detailErrors[item.id] && <p role="status">Đang tải hồ sơ...</p>}
          {detail && (
            <>
              <section>
                <h3>Giới thiệu</h3>
                <p>{detail.introduction}</p>
              </section>
              <section>
                <h3>Kinh nghiệm</h3>
                <p>{detail.experience}</p>
              </section>
              {detail.rejectionReason && (
                <section>
                  <h3>Lý do từ chối</h3>
                  <p>{detail.rejectionReason}</p>
                </section>
              )}
              <section>
                <h3>Tác phẩm</h3>
                {detail.portfolioFiles.length ? (
                  <div className="appr-portfolio-grid">
                    {detail.portfolioFiles.map((file) => {
                      const signed = data.signedUrls[file.id];
                      const expired = signed ? new Date(signed.expiresAt).getTime() <= currentTime : false;
                      return (
                        <div className="appr-portfolio-item" key={file.id}>
                          {signed && !expired
                            ? <img src={signed.url} alt={`Tác phẩm của ${name}`} />
                            : <span className="appr-image-placeholder">Ảnh tác phẩm</span>}
                          {(expired || data.imageErrors[file.id]) && (
                            <span className="appr-image-error" role="alert">
                              {data.imageErrors[file.id] || "Liên kết ảnh đã hết hạn."}
                            </span>
                          )}
                          {(!signed || expired || data.imageErrors[file.id]) && (
                            <button
                              className="appr-button appr-button-quiet"
                              type="button"
                              onClick={() => void data.loadSignedUrls(item.id, [file])}
                            >
                              Tải lại ảnh
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : <p>Chưa có ảnh tác phẩm.</p>}
              </section>
              <section>
                <h3>Lịch sử trạng thái</h3>
                {detail.history.length ? (
                  <ol className="appr-history">
                    {detail.history.map((entry, index) => (
                      <li key={`${entry.occurredAt}-${index}`}>
                        <strong>{mapTeacherStatus(entry.status).label}</strong>
                        <span>{formatDateVi(entry.occurredAt)}</span>
                        {entry.reason && <p>{entry.reason}</p>}
                      </li>
                    ))}
                  </ol>
                ) : <p>Chưa có lịch sử.</p>}
              </section>
            </>
          )}
        </div>
      )}
    </article>
  );
}

export default function ApprovalsPanel({
  section,
  setSection,
  data,
}: {
  section: ApprovalSection;
  setSection: (section: ApprovalSection) => void;
  data: ApprovalData;
}) {
  const [pending, setPending] = useState<PendingDialog | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function confirmAction(reasonCode: string, reason: string): Promise<string | null> {
    if (!pending) return null;
    let result: { error: string | null };
    if (pending.action === "approve-teacher" || pending.action === "reject-teacher") {
      result = await data.runTeacherMutation(
        pending.action,
        pending.id,
        pending.action === "reject-teacher" ? { reasonCode, reason } : undefined
      );
    } else {
      result = await data.runCourseMutation(
        pending.action,
        pending.id,
        pending.action === "reject-course" ? reason : undefined
      );
    }
    if (result.error) return result.error;
    const messages: Record<DialogAction, string> = {
      "approve-teacher": "Đã duyệt hồ sơ giáo viên.",
      "reject-teacher": "Đã từ chối hồ sơ giáo viên.",
      "approve-course": "Đã duyệt đăng khóa học.",
      "reject-course": "Đã từ chối khóa học.",
    };
    setNotice(messages[pending.action]);
    setPending(null);
    return null;
  }

  return (
    <section className="appr-panel" aria-label="Khu vực phê duyệt">
      <nav className="settings-tabs appr-subtabs" aria-label="Mục phê duyệt">
        <button
          className={`settings-tab${section === "khoa-hoc" ? " active" : ""}`}
          type="button"
          aria-current={section === "khoa-hoc" ? "page" : undefined}
          onClick={() => setSection("khoa-hoc")}
        >
          Duyệt khóa học ({data.counts.courses})
        </button>
        <button
          className={`settings-tab${section === "giao-vien" ? " active" : ""}`}
          type="button"
          aria-current={section === "giao-vien" ? "page" : undefined}
          onClick={() => setSection("giao-vien")}
        >
          Duyệt giáo viên ({data.counts.teachers})
        </button>
      </nav>
      {notice && <p className="appr-notice" role="status">{notice}</p>}
      {section === "giao-vien" ? (
        <section className="appr-card">
          <header className="appr-card-heading">
            <div>
              <h2>Duyệt giáo viên</h2>
              <p>Hồ sơ giáo viên. Duyệt để cấp quyền giáo viên hoặc từ chối kèm lý do.</p>
            </div>
          </header>
          <div className="appr-filters">
            <label>
              <span>Lọc trạng thái</span>
              <select
                value={data.teacherStatus}
                onChange={(event) => {
                  data.setTeacherStatus(event.target.value);
                  data.setTeacherPage(1);
                }}
              >
                {statusOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>
            <label>
              <span>Tìm hồ sơ</span>
              <input
                type="search"
                value={data.search}
                onChange={(event) => data.setSearch(event.target.value)}
                placeholder="Tên hoặc email"
              />
            </label>
          </div>
          {data.teacherError && (
            <div className="appr-error" role="alert">
              <span>{data.teacherError}</span>
              <button className="appr-button appr-button-quiet" type="button" onClick={data.refresh}>Thử lại</button>
            </div>
          )}
          {data.teacherLoading ? (
            <p className="appr-loading" role="status">Đang tải danh sách...</p>
          ) : !data.teacherError && data.teacherItems.length === 0 ? (
            <p className="appr-empty">Không có hồ sơ nào.</p>
          ) : !data.teacherError && (
            <>
              <div className="appr-list">
                {data.teacherItems.map((item) => (
                  <TeacherRow
                    item={item}
                    data={data}
                    key={item.id}
                    onDialog={(action, id, name, opener) => setPending({ action, id, name, opener })}
                  />
                ))}
              </div>
              <div className="appr-pagination">
                <button
                  className="appr-button appr-button-quiet"
                  type="button"
                  disabled={data.teacherPage <= 1}
                  onClick={() => data.setTeacherPage((page) => page - 1)}
                >
                  Trước
                </button>
                <span>Trang {data.teacherPage} / {data.pageCount}</span>
                <button
                  className="appr-button appr-button-quiet"
                  type="button"
                  disabled={data.teacherPage >= data.pageCount}
                  onClick={() => data.setTeacherPage((page) => page + 1)}
                >
                  Sau
                </button>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="appr-card">
          <header className="appr-card-heading">
            <div>
              <h2>Duyệt khóa học</h2>
              <p>Khóa học đang chờ duyệt đăng. Duyệt để đăng công khai hoặc từ chối kèm lý do.</p>
            </div>
          </header>
          {data.courseError && (
            <div className="appr-error" role="alert">
              <span>{data.courseError}</span>
              <button className="appr-button appr-button-quiet" type="button" onClick={data.refresh}>Thử lại</button>
            </div>
          )}
          {data.courseLoading ? (
            <p className="appr-loading" role="status">Đang tải danh sách...</p>
          ) : !data.courseError && data.courses.length === 0 ? (
            <p className="appr-empty">Không có khóa học nào đang chờ duyệt.</p>
          ) : !data.courseError && (
            <div className="appr-list">
              {data.courses.map((course) => (
                <CourseRow
                  course={course}
                  key={course.ma_khoa_hoc}
                  onDialog={(action, id, name, opener) => setPending({ action, id, name, opener })}
                />
              ))}
            </div>
          )}
        </section>
      )}
      {pending && <ApprovalDialog pending={pending} onClose={() => setPending(null)} onConfirm={confirmAction} />}
    </section>
  );
}

function CourseRow({
  course,
  onDialog,
}: {
  course: ApprovalData["courses"][number];
  onDialog: (action: DialogAction, id: number, name: string, opener: HTMLButtonElement) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className="appr-course-row">
      {course.anh_dai_dien
        ? <img className="appr-course-cover" src={course.anh_dai_dien} alt="" />
        : <span className="appr-course-cover appr-course-cover-empty" aria-hidden="true" />}
      <div className="appr-course-main">
        <div className="appr-course-copy">
          <strong>{course.tieu_de}</strong>
          <span>{course.teacherName} · {getCourseLevelLabel(course.cap_do)} · {course.chu_de}</span>
          <span>{course.chapters.length} chương · {course.lessonCount} bài học · Tạo ngày {formatDateVi(course.ngay_tao)}</span>
        </div>
        <div className="appr-row-actions">
          <button
            className="appr-button appr-button-quiet"
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Ẩn nội dung" : "Xem nội dung"}
          </button>
          <button
            className="appr-button appr-button-primary"
            type="button"
            onClick={(event) => onDialog("approve-course", course.ma_khoa_hoc, course.tieu_de, event.currentTarget)}
          >
            Duyệt đăng
          </button>
          <button
            className="appr-button appr-button-secondary"
            type="button"
            onClick={(event) => onDialog("reject-course", course.ma_khoa_hoc, course.tieu_de, event.currentTarget)}
          >
            Từ chối
          </button>
        </div>
      </div>
      {expanded && (
        <div className="appr-expanded appr-course-outline">
          {course.chapters.length ? course.chapters.map((chapter) => (
            <section key={chapter.ma_chuong}>
              <h3>{chapter.thu_tu}. {chapter.tieu_de}</h3>
              {chapter.lessons.length ? (
                <ol>
                  {chapter.lessons.map((lesson) => <li key={lesson.ma_bai_hoc}>{lesson.thu_tu}. {lesson.tieu_de}</li>)}
                </ol>
              ) : <p>Chưa có bài học.</p>}
            </section>
          )) : <p>Chưa có chương.</p>}
        </div>
      )}
    </article>
  );
}
