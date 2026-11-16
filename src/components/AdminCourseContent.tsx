import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/useAuth";
import { requestAdminApi } from "../lib/adminApi";
import { sanitizeCoverUrl } from "../logic/publicCourses";

const id = z.number().int().safe();
const chapterSchema = z.object({ ma_chuong: id, tieu_de: z.string(), thu_tu: z.number() });
const lessonSchema = z.object({
  ma_bai_hoc: id, ma_chuong: id, tieu_de: z.string(), thu_tu: z.number(),
  noi_dung_van_ban: z.string().nullable(), duong_dan_anh: z.string().nullable(),
  lien_ket_video: z.string().nullable(), bat_buoc: z.boolean(),
});
const assignmentSchema = z.object({ ma_bai_tap: id, ma_bai_hoc: id, de_bai: z.string(), han_nop: z.string().nullable(), bat_buoc: z.boolean() });
const attachmentSchema = z.object({ ma_tep: id, ma_bai_hoc: id, ten_tep: z.string(), duong_dan: z.string(), dung_luong: z.number() });
const rubricSchema = z.object({ ma_bai_tap: id, ten_tieu_chi: z.string(), ty_trong: z.number(), thu_tu: z.number() });
const contentSchema = z.object({
  chapters: z.array(chapterSchema), lessons: z.array(lessonSchema),
  assignments: z.array(assignmentSchema), attachments: z.array(attachmentSchema),
  rubrics: z.array(rubricSchema),
});
type Content = z.infer<typeof contentSchema>;

function Attachment({ file }: { file: z.infer<typeof attachmentSchema> }) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function getLink() {
    if (!supabase) return;
    setBusy(true); setError("");
    try {
      const result = await supabase.storage.from(import.meta.env.VITE_SUPABASE_ATTACHMENTS_BUCKET?.trim() || "course-attachments").createSignedUrl(file.duong_dan, 600);
      if (result.error) throw result.error;
      setUrl(result.data.signedUrl);
    } catch { setError("Không thể tạo liên kết tải tệp. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  return <li><span>{file.ten_tep} · {(file.dung_luong / 1048576).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} MB</span>{" "}
    {url ? <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => setUrl(null)}>Mở tệp</a> : <button type="button" disabled={busy} onClick={() => void getLink()}>{busy ? "Đang tạo liên kết..." : "Xem / tải tệp"}</button>}
    {error && <p role="alert">{error}</p>}
  </li>;
}

export default function AdminCourseContent({ courseId }: { courseId: number }) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setContent(null); setError("");
    void (async () => {
      try {
        if (!token) throw new Error("Missing session");
        const data = await requestAdminApi(`/api/courses/${courseId}/editor`, { token, signal: controller.signal });
        const next = contentSchema.parse(data);
        if (!controller.signal.aborted) setContent(next);
      } catch {
        if (!controller.signal.aborted) setError("Không thể tải nội dung chương và bài học. Vui lòng thử lại.");
      }
    })();
    return () => controller.abort();
  }, [courseId, token, attempt]);

  return <section className="admin-course-content"><h3>Nội dung chương và bài học</h3>
    {error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt(n => n + 1)}>Thử lại</button></div> : !content ? <p role="status">Đang tải nội dung bài học...</p> : !content.chapters.length ? <p>Khóa học chưa có chương.</p> : content.chapters.map(chapter => {
      const lessons = content.lessons.filter(l => l.ma_chuong === chapter.ma_chuong);
      return <details className="admin-course-chapter" key={chapter.ma_chuong} open>
        <summary>Chương {chapter.thu_tu}: {chapter.tieu_de} <small>({lessons.length} bài học)</small></summary>
        {!lessons.length ? <p>Chương chưa có bài học.</p> : lessons.map(lesson => {
          const image = sanitizeCoverUrl(lesson.duong_dan_anh);
          const video = sanitizeCoverUrl(lesson.lien_ket_video);
          const assignments = content.assignments.filter(a => a.ma_bai_hoc === lesson.ma_bai_hoc);
          const attachments = content.attachments.filter(a => a.ma_bai_hoc === lesson.ma_bai_hoc);
          return <details className="admin-course-lesson" key={lesson.ma_bai_hoc}>
            <summary>Bài {lesson.thu_tu}: {lesson.tieu_de} <small>· {lesson.bat_buoc ? "Bắt buộc" : "Không bắt buộc"}</small></summary>
            <div className="admin-course-lesson-body">
              {lesson.noi_dung_van_ban && <p className="admin-course-description">{lesson.noi_dung_van_ban}</p>}
              {image && <a href={image} target="_blank" rel="noopener noreferrer"><img src={image} alt={`Ảnh bài học ${lesson.tieu_de}`} loading="lazy" /></a>}
              {video && <p><a href={video} target="_blank" rel="noopener noreferrer">Mở video bài học</a></p>}
              {!lesson.noi_dung_van_ban && !image && !video && <p>Chưa có nội dung văn bản, ảnh hoặc video.</p>}
              {attachments.length > 0 && <section><h4>Tệp tham khảo</h4><ul>{attachments.map(file => <Attachment file={file} key={file.ma_tep} />)}</ul></section>}
              {assignments.map(assignment => <section key={assignment.ma_bai_tap}><h4>Bài tập {assignment.bat_buoc ? "bắt buộc" : "tham khảo"}</h4><p className="admin-course-description">{assignment.de_bai}</p>
                {assignment.han_nop && <p>Hạn nộp: {new Date(assignment.han_nop).toLocaleString("vi-VN")}</p>}
                <ul>{content.rubrics.filter(r => r.ma_bai_tap === assignment.ma_bai_tap).map((rubric, index) => <li key={index}>{rubric.ten_tieu_chi} · {rubric.ty_trong}%</li>)}</ul>
              </section>)}
            </div>
          </details>;
        })}
      </details>;
    })}
  </section>;
}
