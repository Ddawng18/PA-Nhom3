import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  Flame,
  FolderHeart,
  LayoutDashboard,
  PenTool,
  Settings,
  Sparkles,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

type SidebarProps = {
  user: User;
  displayName: string;
  initials: string;
};

const navigationItems = [
  { label: "Tổng quan", icon: LayoutDashboard },
  { label: "Khóa học của tôi", icon: BookOpen },
  { label: "Studio", icon: PenTool },
  { label: "Bài luyện tập", icon: Sparkles },
  { label: "Tiến độ", icon: ChartNoAxesColumnIncreasing },
  { label: "Tác phẩm", icon: FolderHeart },
  { label: "Cài đặt", icon: Settings, active: true },
];

export default function Sidebar({ user, displayName, initials }: SidebarProps) {
  return (
    <aside className="settings-sidebar">
      <a className="settings-brand" href="/settings" aria-label="LINEA - Hồ sơ và cài đặt">
        <span className="settings-brand-name">LINEA</span>
        <span className="settings-brand-caption">Không gian học sáng tạo</span>
      </a>

      <nav className="settings-navigation" aria-label="Điều hướng chính">
        {navigationItems.map(({ label, icon: Icon, active }) => (
          <button
            className={`settings-nav-item${active ? " active" : ""}`}
            type="button"
            aria-current={active ? "page" : undefined}
            key={label}
          >
            <Icon aria-hidden="true" size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <section className="streak-card" aria-label="Chuỗi học tập">
        <div className="streak-heading">
          <span className="streak-icon"><Flame aria-hidden="true" size={17} /></span>
          <span>Chuỗi 7 ngày</span>
        </div>
        <p>Còn 3 ngày để nhận huy hiệu</p>
        <div className="streak-progress" role="progressbar" aria-valuenow={70} aria-valuemin={0} aria-valuemax={100}>
          <span />
        </div>
      </section>

      <div className="sidebar-user">
        <span className="avatar avatar-sidebar" aria-hidden="true">{initials}</span>
        <span className="sidebar-user-details">
          <span className="sidebar-user-name">{displayName}</span>
          <span className="sidebar-user-email">{user.email}</span>
        </span>
      </div>
    </aside>
  );
}
