import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../auth/useAuth";
import PublicHeader from "../components/PublicHeader";
import { AdminApiError, requestAdminApi } from "../lib/adminApi";
import "../styles/studio.css";

const postSchema = z.object({ id: z.number().int().positive(), title: z.string(), body: z.string(), author: z.string(), createdAt: z.string() });
type Post = z.infer<typeof postSchema>;

export default function CommunityPage() {
  const { postId } = useParams();
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
      const post = postSchema.parse(await requestAdminApi("/api/community/posts", { token: session.access_token, method: "POST", body: { title: title.trim(), body: body.trim() } }));
      setTitle(""); setBody(""); setPage(1); setPosts(current => [post, ...current].slice(0, 20)); setNotice("Đã đăng bài viết.");
      setRetry(value => value + 1);
    } catch { setNotice("Không thể đăng bài. Nội dung của bạn vẫn được giữ lại, hãy thử lại."); }
    finally { setBusy(false); }
  }

  return <div className="community-page"><PublicHeader authLink={{ to: "/login", label: "Đăng nhập" }} /><main className="community-main">
    <header className="community-heading"><div><p className="guest-eyebrow">GÓC CHIA SẺ</p><h1>{postId ? "Bài viết" : "Cùng nhau luyện vẽ"}</h1><p>Chia sẻ hành trình học vẽ cùng cộng đồng LINEA.</p></div>{postId && <Link to="/community">← Tất cả bài viết</Link>}</header>
    {!postId && (authLoading ? <p role="status">Đang kiểm tra tài khoản...</p> : session ? <form className="community-compose" onSubmit={publish}>
      <h2>Chia sẻ bài viết</h2><label htmlFor="post-title">Tiêu đề</label><input id="post-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={160} required />
      <label htmlFor="post-body">Nội dung</label><textarea id="post-body" value={body} onChange={e => setBody(e.target.value)} maxLength={5000} required />
      <button type="submit" disabled={busy}>{busy ? "Đang đăng..." : "Đăng bài"}</button>{notice && <p role="status">{notice}</p>}
    </form> : <p><Link to="/login">Đăng nhập</Link> để chia sẻ bài viết.</p>)}
    {loading ? <p role="status">Đang tải bài viết...</p> : error ? <section role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(v => v + 1)}>Thử lại</button></section>
      : posts.length === 0 ? <section className="community-empty"><h2>Chưa có bài viết</h2><p>Hãy là người đầu tiên chia sẻ.</p></section>
      : <div className="community-feed">{posts.map(post => <article className="community-post community-post-text" key={post.id}><div className="community-post-body"><p className="community-author">{post.author} <span>· {new Date(post.createdAt).toLocaleString("vi-VN")}</span></p><h2><Link to={`/community/${post.id}`}>{post.title}</Link></h2><p className="community-post-content">{post.body}</p></div></article>)}</div>}
    {!postId && !loading && !error && <nav aria-label="Phân trang bài viết" className="community-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage(v => v - 1)}>Trước</button><span>Trang {page}</span><button type="button" disabled={posts.length < 20} onClick={() => setPage(v => v + 1)}>Sau</button></nav>}
  </main></div>;
}
