import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import EmptyState from "../components/ui/EmptyState";
import { getDisplayName, getInitials } from "../lib/userDisplay";
import "../styles/settings.css";

export default function ArtworksPage() {
  const { user } = useAuth();
  if (!user) return null;
  const displayName = getDisplayName(user);
  return (
    <div className="settings-shell">
      <Sidebar user={user} displayName={displayName} initials={getInitials(displayName)} />
      <main className="settings-main">
        <div className="settings-content">
          <header className="settings-page-heading">
            <div>
              <p className="settings-eyebrow">KHÔNG GIAN SÁNG TẠO</p>
              <h1>Tác phẩm</h1>
              <p>Studio hiện lưu bản vẽ trong trình duyệt trên thiết bị bạn đang dùng.</p>
            </div>
          </header>
          <EmptyState
            title="Thư viện tác phẩm chưa khả dụng"
            description="Bản vẽ Studio và bài luyện tập đã nộp chưa được đồng bộ vào trang này. Bạn có thể mở lại bản vẽ trong cùng trình duyệt, tải PNG/GIF từ Studio hoặc xem bài đã nộp trong Bài luyện tập."
            action={<Link className="button button-primary" to="/studio">Mở Studio</Link>}
          />
        </div>
      </main>
    </div>
  );
}
