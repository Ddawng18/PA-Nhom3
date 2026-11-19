import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../auth/useAuth";
import PublicHeader from "../components/PublicHeader";
import { AdminApiError, requestAdminApi } from "../lib/adminApi";
import { prepareCommunityImage } from "../lib/communityImages";
import "../styles/studio.css";

const postSchema = z.object({ id: z.number().int().positive(), authorId: z.string().optional(), title: z.string(), body: z.string(), author: z.string(), createdAt: z.string(), imageUrl: z.string().nullable().optional(), commentCount: z.number().default(0) });
type Post = z.infer<typeof postSchema>;
const commentSchema = z.object({ id: z.number(), body: z.string(), author: z.string(), createdAt: z.string(), imageUrl: z.string().nullable().optional() });

function ImagePicker({ id, file, setFile, disabled }: { id: string; file: File | null; setFile: (file: File | null) => void; disabled: boolean }) {
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <div className="community-image-picker"><label htmlFor={id}>Đính kèm ảnh</label><input id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={event => {
    const image = event.target.files?.[0]; event.target.value = "";
    if (!image) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(image.type) || image.size === 0 || image.size > 5 * 1024 * 1024) { setError("Chọn JPG, PNG hoặc WEBP tối đa 5 MB."); return; }
    setError(""); setFile(image);
  }} /><small>1 ảnh · tự nén tối đa 512 KB trước khi tải lên</small>
    {error && <p role="alert">{error}</p>}
    {preview && <div className="community-image-preview"><img src={preview} alt="Ảnh đính kèm xem trước" /><button type="button" disabled={disabled} onClick={() => setFile(null)}>Gỡ ảnh</button></div>}
  </div>;
}

function Comments({ id, count, initiallyOpen, onAdded }: { id: number; count: number; initiallyOpen: boolean; onAdded: () => void }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(initiallyOpen);
  const [items, setItems] = useState<z.infer<typeof commentSchema>[]>([]);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [image, setImage] = useState<File | null>(null);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    void requestAdminApi(`/api/community/posts/${id}/comments`, { signal: controller.signal }, { page })
      .then(data => { if (!controller.signal.aborted) setItems(z.array(commentSchema).parse(data)); })
      .catch(() => { if (!controller.signal.aborted) setError("Không thể tải bình luận."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, open, page, attempt]);
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!session || busy || (!body.trim() && !image)) return;
    setBusy(true); setNotice("");
    try {
      const form = new FormData(); form.append("body", body.trim());
      if (image) form.append("image", await prepareCommunityImage(image));
      commentSchema.parse(await requestAdminApi(`/api/community/posts/${id}/comments/with-image`, {
        token: session.access_token, method: "POST", body: form,
      }));
      setBody(""); setImage(null); setPage(1); setAttempt(n => n + 1); onAdded(); setNotice("Đã gửi bình luận.");
    } catch (error) { setNotice(`${error instanceof Error ? error.message : "Chưa gửi được bình luận."} Nội dung và ảnh được giữ lại để thử lại.`); }
    finally { setBusy(false); }
  }
  return <section className="community-comments">
    <button type="button" aria-expanded={open} onClick={() => setOpen(current => !current)}>Bình luận ({count})</button>
    {open && <>
      {loading ? <p role="status">Đang tải bình luận...</p> : error ? <p role="alert">{error} <button type="button" onClick={() => setAttempt(n => n + 1)}>Thử lại</button></p>
        : items.length === 0 ? <p>Chưa có bình luận. Hãy chia sẻ ý kiến đầu tiên.</p>
        : <ul className="community-comment-list">{items.map(item => <li key={item.id}><strong>{item.author}</strong><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("vi-VN")}</time><p>{item.body}</p>{item.imageUrl && <a href={item.imageUrl} target="_blank" rel="noopener noreferrer"><img className="community-comment-image" src={item.imageUrl} alt={`Ảnh bình luận của ${item.author}`} loading="lazy" /></a>}</li>)}</ul>}
      {!loading && !error && <nav aria-label="Phân trang bình luận"><button type="button" disabled={page <= 1} onClick={() => setPage(n => n - 1)}>Trước</button><span>Trang {page}</span><button type="button" disabled={items.length < 20} onClick={() => setPage(n => n + 1)}>Sau</button></nav>}
      {session ? <form onSubmit={send}><label htmlFor={`comment-${id}`}>Viết bình luận</label><textarea id={`comment-${id}`} maxLength={2000} disabled={busy} value={body} onChange={event => setBody(event.target.value)} placeholder="Viết bình luận hoặc đính kèm ảnh..." /><ImagePicker id={`comment-image-${id}`} file={image} setFile={setImage} disabled={busy} /><button type="submit" disabled={busy || (!body.trim() && !image)}>{busy ? "Đang gửi..." : "Gửi bình luận"}</button></form>
        : <p><Link to="/login">Đăng nhập</Link> để bình luận.</p>}
      {notice && <p role="status">{notice}</p>}
    </>}
  </section>;
}

function CommunityPost({ post, detail, onUpdated, onDeleted, onComment }: {
  post: Post; detail: boolean; onUpdated: (post: Post) => void; onDeleted: () => void; onComment: () => void;
}) {
  const { user, session } = useAuth();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [image, setImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const own = Boolean(user && post.authorId === user.id);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!session || busy || !own) return;
    setBusy(true); setNotice("");
    try {
      const form = new FormData(); form.append("title", title.trim()); form.append("body", body.trim()); form.append("removeImage", String(removeImage));
      if (image) form.append("image", await prepareCommunityImage(image));
      const saved = postSchema.parse(await requestAdminApi(`/api/community/posts/${post.id}`, { token: session.access_token, method: "PUT", body: form }));
      onUpdated(saved); setEditing(false); setImage(null); setNotice("Đã lưu bài viết.");
    } catch (error) { setNotice(`${error instanceof Error ? error.message : "Chưa lưu được bài viết."} Bản sửa vẫn được giữ lại.`); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!session || busy || !own || !window.confirm("Xóa bài viết này cùng toàn bộ bình luận và ảnh đính kèm?")) return;
    setBusy(true); setNotice("");
    try {
      await requestAdminApi(`/api/community/posts/${post.id}`, { token: session.access_token, method: "DELETE" });
      onDeleted();
    } catch { setNotice("Chưa xóa được bài viết. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  return <article className="community-post community-post-text"><div className="community-post-body">
    <p className="community-author">{post.author} <span>· {new Date(post.createdAt).toLocaleString("vi-VN")}</span></p>
    {own && !editing && <div className="community-post-actions"><button type="button" disabled={busy} onClick={() => { setTitle(post.title); setBody(post.body); setImage(null); setRemoveImage(false); setNotice(""); setEditing(true); }}>Sửa bài viết</button><button type="button" disabled={busy} onClick={() => void remove()}>{busy ? "Đang xóa..." : "Xóa bài viết"}</button></div>}
    {editing ? <form className="community-compose" onSubmit={save}>
      <label htmlFor={`edit-title-${post.id}`}>Tiêu đề</label><input id={`edit-title-${post.id}`} value={title} maxLength={160} required disabled={busy} onChange={event => setTitle(event.target.value)} />
      <label htmlFor={`edit-body-${post.id}`}>Nội dung</label><textarea id={`edit-body-${post.id}`} value={body} maxLength={5000} required disabled={busy} onChange={event => setBody(event.target.value)} />
      {post.imageUrl && !removeImage && !image && <div className="community-image-preview"><img src={post.imageUrl} alt="Ảnh hiện tại" loading="lazy" /><button type="button" disabled={busy} onClick={() => setRemoveImage(true)}>Gỡ ảnh hiện tại</button></div>}
      <ImagePicker id={`edit-image-${post.id}`} file={image} setFile={setImage} disabled={busy} />
      <div className="community-post-actions"><button type="submit" disabled={busy}>{busy ? "Đang lưu..." : "Lưu thay đổi"}</button><button type="button" disabled={busy} onClick={() => { setEditing(false); setImage(null); setNotice(""); }}>Hủy</button></div>
    </form> : <><h2><Link to={`/community/${post.id}`}>{post.title}</Link></h2><p className="community-post-content">{post.body}</p>
      {post.imageUrl && <a href={post.imageUrl} target="_blank" rel="noopener noreferrer"><img className="community-post-image" src={post.imageUrl} alt={`Ảnh đính kèm: ${post.title}`} loading="lazy" /></a>}
    </>}
    {notice && <p role="status">{notice}</p>}
    <Comments id={post.id} count={post.commentCount} initiallyOpen={detail} onAdded={onComment} />
  </div></article>;
}

export default function CommunityPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(1);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!image) { setPreview(""); return; }
    const url = URL.createObjectURL(image); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    const path = postId ? `/api/community/posts/${encodeURIComponent(postId)}` : "/api/community/posts";
    void requestAdminApi(path, { signal: controller.signal }, postId ? undefined : { page })
      .then(data => { if (!controller.signal.aborted) setPosts(postId ? [postSchema.parse(data)] : z.array(postSchema).parse(data)); })
      .catch((err: unknown) => { if (!controller.signal.aborted) setError(err instanceof AdminApiError && err.status === 404 ? "Không tìm thấy bài viết." : "Không thể tải bài viết. Vui lòng thử lại."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [postId, retry, page]);

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!session || busy) return;
    if (!title.trim() || !body.trim()) { setNotice("Vui lòng nhập tiêu đề và nội dung."); return; }
    setBusy(true); setNotice("");
    try {
      const form = new FormData(); form.append("title", title.trim()); form.append("body", body.trim());
      if (image) form.append("image", await prepareCommunityImage(image));
      const post = postSchema.parse(await requestAdminApi("/api/community/posts/with-image", { token: session.access_token, method: "POST", body: form }));
      setTitle(""); setBody(""); setImage(null); setPage(1); setPosts(current => [post, ...current].slice(0, 20)); setNotice("Đã đăng bài viết.");
      setRetry(value => value + 1);
    } catch (error) { setNotice(`${error instanceof Error ? error.message : "Không thể đăng bài."} Nội dung và ảnh vẫn được giữ lại để thử lại.`); }
    finally { setBusy(false); }
  }

  return <div className="community-page"><PublicHeader authLink={{ to: "/login", label: "Đăng nhập" }} /><main className="community-main">
    <header className="community-heading"><div><p className="guest-eyebrow">GÓC CHIA SẺ</p><h1>{postId ? "Bài viết" : "Cùng nhau luyện vẽ"}</h1><p>Chia sẻ hành trình học vẽ cùng cộng đồng LINEA.</p></div>{postId && <Link to="/community">← Tất cả bài viết</Link>}</header>
    {!postId && (authLoading ? <p role="status">Đang kiểm tra tài khoản...</p> : session ? <form className="community-compose" onSubmit={publish}>
      <h2>Chia sẻ bài viết</h2><label htmlFor="post-title">Tiêu đề</label><input id="post-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={160} required disabled={busy} />
      <label htmlFor="post-body">Nội dung</label><textarea id="post-body" value={body} onChange={e => setBody(e.target.value)} maxLength={5000} required disabled={busy} />
      <label htmlFor="post-image">Ảnh đính kèm (không bắt buộc)</label>
      <input id="post-image" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => {
        const file = event.target.files?.[0]; event.target.value = "";
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024 || file.size === 0) { setNotice("Chọn ảnh JPG, PNG hoặc WEBP tối đa 5 MB."); return; }
        setImage(file); setNotice("");
      }} />
      <small>JPG, PNG, WEBP · chọn ảnh tối đa 5 MB · tự nén tối đa 512 KB khi đăng</small>
      {preview && <div className="community-image-preview"><img src={preview} alt="Ảnh xem trước bài viết" /><button type="button" disabled={busy} onClick={() => setImage(null)}>Gỡ ảnh</button></div>}
      <button type="submit" disabled={busy}>{busy ? "Đang đăng..." : "Đăng bài"}</button>{notice && <p role="status">{notice}</p>}
    </form> : <p><Link to="/login">Đăng nhập</Link> để chia sẻ bài viết.</p>)}
    {loading ? <p role="status">Đang tải bài viết...</p> : error ? <section role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(v => v + 1)}>Thử lại</button></section>
      : posts.length === 0 ? <section className="community-empty"><h2>Chưa có bài viết</h2><p>Hãy là người đầu tiên chia sẻ.</p></section>
      : <div className="community-feed">{posts.map(post => <CommunityPost key={post.id} post={post} detail={Boolean(postId)}
        onUpdated={saved => setPosts(current => current.map(item => item.id === saved.id ? saved : item))}
        onDeleted={() => { setPosts(current => current.filter(item => item.id !== post.id)); if (postId) navigate("/community", { replace: true }); }}
        onComment={() => setPosts(current => current.map(item => item.id === post.id ? { ...item, commentCount: item.commentCount + 1 } : item))} />)}</div>}
    {!postId && !loading && !error && <nav aria-label="Phân trang bài viết" className="community-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage(v => v - 1)}>Trước</button><span>Trang {page}</span><button type="button" disabled={posts.length < 20} onClick={() => setPage(v => v + 1)}>Sau</button></nav>}
  </main></div>;
}
