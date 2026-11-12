import { useEffect, useState } from "react";
import { buildApiUrl } from "../logic/approvals";
import { learningError } from "../lib/learningApi";

export default function SubmissionImage({ token, id }: { token: string; id: number }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let blobUrl: string | undefined;
    setUrl(""); setError("");
    const timer = window.setTimeout(() => controller.abort(), 30000);
    async function load() {
      const base = import.meta.env.VITE_API_URL;
      if (!base) throw new Error("Chưa cấu hình địa chỉ máy chủ.");
      const response = await fetch(buildApiUrl(base, `/api/assignments/submissions/${id}/image`), {
        headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: "no-store",
      });
      if (!response.ok) throw new Error("Không thể tải ảnh bài nộp.");
      if (response.headers.get("Content-Type")?.includes("application/json")) {
        const data: unknown = await response.json();
        if (!data || typeof data !== "object" || !("url" in data) || typeof data.url !== "string" || !data.url.startsWith("https://")) throw new Error("Đường dẫn ảnh không hợp lệ.");
        if (!controller.signal.aborted) setUrl(data.url);
      } else {
        blobUrl = URL.createObjectURL(await response.blob());
        if (!controller.signal.aborted) setUrl(blobUrl);
      }
    }
    void load().catch(e => { if (!controller.signal.aborted) setError(learningError(e)); })
      .finally(() => window.clearTimeout(timer));
    return () => { controller.abort(); window.clearTimeout(timer); if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [token, id, attempt]);
  return <div className="submission-image">{url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Ảnh bài nộp" onError={() => { setUrl(""); setError("Ảnh hết hạn hoặc không còn tồn tại. Tải lại để xem."); }} /></a>
    : error ? <p role="alert">{error}</p> : <p role="status">Đang tải ảnh...</p>}
    <button type="button" className="button button-outline" onClick={() => setAttempt(v => v + 1)}>Tải lại ảnh</button>
  </div>;
}
