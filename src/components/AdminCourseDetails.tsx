import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useAuth } from "../auth/useAuth";
import { requestAdminApi } from "../lib/adminApi";
import { getCourseLevelLabel, getCourseStatusLabel } from "../logic/courseEditor";
import { sanitizeCoverUrl } from "../logic/publicCourses";
import AdminCourseContent from "./AdminCourseContent";
import "../styles/admin-course-details.css";

const detailSchema = z.object({
  id: z.number(), title: z.string(), description: z.string().nullable(),
  teacherName: z.string().nullable(), teacherEmail: z.string().nullable(),
  level: z.string(), topic: z.string(), coverImage: z.string().nullable(),
  status: z.string(), priceVnd: z.number(), chapterCount: z.number(),
  lessonCount: z.number(), studentCount: z.number(), createdAt: z.string(),
  history: z.array(z.object({ status: z.string(), reason: z.string().nullable(), occurredAt: z.string() })),
});

export default function AdminCourseDetails({ courseId, onClose }: { courseId: number; onClose: () => void }) {
  const { session } = useAuth();
  const token = session?.access_token;
  const dialog = useRef<HTMLDialogElement>(null);
  const [detail, setDetail] = useState<z.infer<typeof detailSchema> | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.showModal();
    return () => { opener?.focus(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setDetail(null); setError("");
    if (!token) { setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."); return; }
    void requestAdminApi(`/api/admin/courses/${courseId}`, { token, signal: controller.signal })
      .then((value) => { if (!controller.signal.aborted) setDetail(detailSchema.parse(value)); })
      .catch(() => { if (!controller.signal.aborted) setError("Không thể tải thông tin khóa học. Vui lòng thử lại."); });
    return () => controller.abort();
  }, [courseId, token, attempt]);
  const cover = sanitizeCoverUrl(detail?.coverImage);
  return <dialog className="admin-course-dialog" ref={dialog} aria-labelledby="admin-course-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) {
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    } }}>
    <header><h2 id="admin-course-title">{detail?.title ?? "Thông tin khóa học"}</h2><button type="button" onClick={onClose} aria-label="Đóng thông tin khóa học">Đóng</button></header>
    {error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt((n) => n + 1)}>Thử lại</button></div> : !detail ? <p role="status">Đang tải thông tin khóa học...</p> : <>
      {cover && <img className="admin-course-cover" src={cover} alt={`Ảnh bìa ${detail.title}`} />}
      <dl>
        <div><dt>Mã khóa học</dt><dd>{detail.id}</dd></div>
        <div><dt>Trạng thái</dt><dd>{getCourseStatusLabel(detail.status)}</dd></div>
        <div><dt>Giáo viên</dt><dd>{detail.teacherName || "Chưa có tên"}{detail.teacherEmail && <span>{detail.teacherEmail}</span>}</dd></div>
        <div><dt>Cấp độ</dt><dd>{getCourseLevelLabel(detail.level)}</dd></div>
        <div><dt>Chủ đề</dt><dd>{detail.topic || "Chưa có chủ đề"}</dd></div>
        <div><dt>Giá khóa học</dt><dd>{detail.priceVnd > 0 ? `${detail.priceVnd.toLocaleString("vi-VN")} đ` : "Miễn phí"}</dd></div>
        <div><dt>Nội dung</dt><dd>{detail.chapterCount} chương · {detail.lessonCount} bài học</dd></div>
        <div><dt>Học viên</dt><dd>{detail.studentCount}</dd></div>
        <div><dt>Ngày tạo</dt><dd>{new Date(detail.createdAt).toLocaleString("vi-VN")}</dd></div>
      </dl>
      <section><h3>Mô tả khóa học</h3><p className="admin-course-description">{detail.description || "Chưa có mô tả."}</p></section>
      <AdminCourseContent courseId={courseId} />
      <section><h3>Lịch sử trạng thái</h3>{detail.history.length ? <ul>{detail.history.map((entry, index) => <li key={`${entry.occurredAt}-${index}`}>
        {new Date(entry.occurredAt).toLocaleString("vi-VN")} · {getCourseStatusLabel(entry.status)}{entry.reason && ` · ${entry.reason}`}
      </li>)}</ul> : <p>Chưa có lịch sử.</p>}</section>
    </>}
  </dialog>;
}
