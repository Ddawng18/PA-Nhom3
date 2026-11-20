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
              <p>Lưu và xem lại những tác phẩm bạn đã hoàn thành trong quá trình học.</p>
            </div>
          </header>
          <EmptyState
            title="Chưa có tác phẩm nào"
            description="Tác phẩm của bạn sẽ xuất hiện tại đây sau khi được lưu từ Studio hoặc gửi trong bài luyện tập."
            action={<Link className="button button-primary" to="/studio">Mở Studio</Link>}
          />
        </div>
      </main>
    </div>
  );
}
