import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  FolderHeart,
  LayoutDashboard,
  PenTool,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { useUserRole } from "../hooks/useUserRole";
import { loadUserProfile, subscribeUserProfile } from "../lib/userProfile";
import { useEffect, useState } from "react";

type SidebarProps = {
  user: User;
  displayName: string;
  initials: string;
};

const navigationItems = [
  { label: "Tổng quan", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Khóa học", icon: BookOpen, to: "/my-courses" },
  { label: "Studio", icon: PenTool, to: "/studio" },
  { label: "Bài luyện tập", icon: Sparkles, to: "/assignments" },
  { label: "Tiến độ", icon: ChartNoAxesColumnIncreasing, to: "/progress" },
  { label: "Đơn demo", icon: BookOpen, to: "/orders" },
  { label: "Tác phẩm", icon: FolderHeart, to: null },
  { label: "Cộng đồng", icon: Users, to: "/community" },
  { label: "Cài đặt", icon: Settings, to: "/settings" },
  { label: "Hồ sơ giáo viên", icon: PenTool, to: "/teacher/onboarding" },
];

export default function Sidebar({ user, displayName, initials }: SidebarProps) {
  const { role } = useUserRole();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  useEffect(() => {
    let active = true;
    let changed = false;
    setProfile(null);
    const unsubscribe = subscribeUserProfile(user.id, (value) => {
      changed = true;
      setProfile(value);
    });
    void loadUserProfile(user.id).then((value) => {
      if (active && !changed) setProfile(value);
    }).catch(() => {
      if (active && !changed) setProfile(null);
    });
    return () => { active = false; unsubscribe(); };
  }, [user.id]);
  const sidebarName = profile?.display_name?.trim() || displayName;
  const sidebarInitials = sidebarName.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
  const adminNavigationItem = role === "admin"
    ? { label: "Quản trị viên", icon: Users, to: "/admin/manage" }
    : null;

  return (
    <aside className="settings-sidebar">
      <Link className="settings-brand" to="/dashboard" aria-label="LINEA - Tổng quan">
        <span className="settings-brand-name">LINEA</span>
        <span className="settings-brand-caption">Không gian học sáng tạo</span>
      </Link>

      <nav className="settings-navigation" aria-label="Điều hướng chính">
        {[...navigationItems, ...(adminNavigationItem ? [adminNavigationItem] : [])].map(({ label, icon: Icon, to }) => (
          to ? (
            <NavLink
              className={({ isActive }) => `settings-nav-item${isActive ? " active" : ""}`}
              to={to}
              key={label}
              end
            >
              <Icon aria-hidden="true" size={18} />
              <span>{label}</span>
            </NavLink>
          ) : (
            <button className="settings-nav-item" type="button" key={label}>
              <Icon aria-hidden="true" size={18} />
              <span>{label}</span>
            </button>
          )
        ))}
      </nav>

      <div className="sidebar-user">
        {profile?.avatar_url ? (
          <img className="avatar avatar-sidebar" src={profile.avatar_url} alt="" />
        ) : (
          <span className="avatar avatar-sidebar" aria-hidden="true">{sidebarInitials || initials}</span>
        )}
        <span className="sidebar-user-details">
          <span className="sidebar-user-name">{sidebarName}</span>
          <span className="sidebar-user-email">{user.email}</span>
        </span>
      </div>
    </aside>
  );
}
