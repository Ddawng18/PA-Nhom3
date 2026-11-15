import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import "../styles/studio.css";

const posts = [
  { id: "net-but", author: "Minh Anh · học viên mẫu", time: "Hôm nay · dữ liệu mẫu", title: "Luyện nét mỗi ngày", body: "Mình thử chia bài luyện thành những nét ngắn để tay đỡ bị cứng. Hôm nay tập nét cong và thay đổi lực tay.", color: "#dce9cf", likes: 12, comments: ["Nét đều hơn rồi!", "Mình cũng đang luyện bài này."] },
  { id: "mau-sac", author: "Quỳnh Chi · học viên mẫu", time: "Hôm qua · dữ liệu mẫu", title: "Thử phối màu ấm", body: "Một nghiên cứu nhỏ về sắc cam và xanh lá. Cứ thử nhiều bản nháp trước khi chọn bảng màu cuối nhé.", color: "#f0dfc9", likes: 8, comments: ["Bảng màu dễ chịu quá."] },
  { id: "phac-thao", author: "Gia Bảo · học viên mẫu", time: "2 ngày trước · dữ liệu mẫu", title: "Phác thảo nhanh 5 phút", body: "Đặt đồng hồ 5 phút và vẽ hình khối lớn trước. Bài tập này giúp mình bớt sa đà vào chi tiết.", color: "#d9e6e9", likes: 15, comments: ["Sẽ thử trong buổi học tới."] },
];

export default function CommunityPage() {
  const { postId } = useParams();
  const post = posts.find((item) => item.id === postId);
  const [liked, setLiked] = useState<string[]>([]);
  const [comments, setComments] = useState<Record<string, string[]>>({});
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const detail = Boolean(postId);
  const visible = detail ? (post ? [post] : []) : posts;
  const addComment = (id: string) => {
    if (!draft.trim()) { setNotice("Nhập nội dung bình luận trước khi gửi."); return; }
    setComments((current) => ({ ...current, [id]: [...(current[id] ?? []), draft.trim()] }));
    setDraft(""); setNotice("Đã thêm bình luận mẫu trong phiên này; tải lại trang sẽ xóa.");
  };
  return <div className="community-page"><PublicHeader authLink={{ to: "/login", label: "Đăng nhập" }} /><main className="community-main">
    <header className="community-heading"><div><p className="guest-eyebrow">GÓC CHIA SẺ</p><h1>{detail ? "Bài viết" : "Cùng nhau luyện vẽ"}</h1><p>Ý tưởng và hành trình học vẽ từ cộng đồng LINEA.</p></div>{detail && <Link to="/community">← Tất cả bài viết</Link>}</header>
    <p className="community-demo" role="note"><strong>DEMO — DỮ LIỆU MẪU, TƯƠNG TÁC KHÔNG ĐƯỢC LƯU.</strong> Không nhập thông tin cá nhân hoặc nội dung nhạy cảm.</p>
    {!visible.length ? <section className="community-empty"><h2>Không tìm thấy bài viết</h2><Link to="/community">Quay lại cộng đồng</Link></section> : <div className="community-feed">{visible.map((item) => <article className="community-post" key={item.id}>
      <div className="community-art" style={{ background: item.color }} aria-hidden="true"><span>LINEA</span></div>
      <div className="community-post-body"><p className="community-author">{item.author} <span>· {item.time}</span></p><h2><Link to={`/community/${item.id}`}>{item.title}</Link></h2><p>{item.body}</p>
        <div className="community-actions"><button type="button" aria-pressed={liked.includes(item.id)} onClick={() => setLiked((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}>♡ {item.likes + Number(liked.includes(item.id))} thích</button><Link to={`/community/${item.id}`}>Xem bình luận ({item.comments.length + (comments[item.id]?.length ?? 0)})</Link><button type="button" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/community/${item.id}`).then(() => setNotice("Đã sao chép liên kết demo."), () => setNotice("Không thể sao chép liên kết trên thiết bị này.")); }}>Sao chép liên kết</button></div>
        {detail && <section className="community-comments" aria-label="Bình luận mẫu"><h3>Bình luận · dữ liệu mẫu</h3><ul>{[...item.comments, ...(comments[item.id] ?? [])].map((comment, index) => <li key={`${index}-${comment}`}>{comment}</li>)}</ul><label htmlFor="demo-comment">Thử bình luận trong phiên này</label><textarea id="demo-comment" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={300} placeholder="Tối đa 300 ký tự" /><button type="button" onClick={() => addComment(item.id)}>Thêm bình luận demo</button>{notice && <p role="status">{notice}</p>}</section>}
      </div>
    </article>)}</div>}
    {!detail && notice && <p className="community-notice" role="status">{notice}</p>}
  </main></div>;
}
