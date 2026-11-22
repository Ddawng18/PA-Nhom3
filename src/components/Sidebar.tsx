import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  Compass,
  ClipboardList,
  FolderHeart,
  GraduationCap,
  LayoutDashboard,
  PenTool,
  Settings,
  ShoppingCart,
  ShieldAlert,
  Sparkles,
  Users,
  LogOut,
  ChevronUp,
  Menu,
  X,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { useUserRole } from "../hooks/useUserRole";
import { loadUserProfile, subscribeUserProfile } from "../lib/userProfile";
import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { dashboardByRole } from "../logic/homeRoute";

type SidebarProps = {
  user: User;
  displayName: string;
  initials: string;
};

const teacherApplication = { label: "Bạn muốn làm giáo viên?", icon: PenTool, to: "/teacher/onboarding" };

const studentNavigation = [
  { label: "Tổng quan", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Lộ trình", icon: Compass, to: "/onboarding" },
  { label: "Khóa học", icon: BookOpen, to: "/my-courses" },
  { label: "Giỏ hàng", icon: ShoppingCart, to: "/cart" },
  { label: "Studio", icon: PenTool, to: "/studio" },
  { label: "Bài luyện tập", icon: Sparkles, to: "/assignments" },
  { label: "Tiến độ", icon: ChartNoAxesColumnIncreasing, to: "/progress" },
  { label: "Đơn hàng", icon: BookOpen, to: "/orders" },
  { label: "Tác phẩm", icon: FolderHeart, to: "/artworks" },
  { label: "Cộng đồng", icon: Users, to: "/community" },
  { label: "Cài đặt", icon: Settings, to: "/settings" },
];

const teacherNavigation = [
  { label: "Tổng quan", icon: LayoutDashboard, to: "/teacher" },
  { label: "Khóa học của tôi", icon: BookOpen, to: "/my-courses" },
  { label: "Bài chờ chấm", icon: ClipboardList, to: "/teacher/submissions" },
  { label: "Học viên", icon: GraduationCap, to: "/teacher/students" },
  { label: "Tạo khóa học", icon: Sparkles, to: "/teacher/courses/new" },
  { label: "Cộng đồng", icon: Users, to: "/community" },
  { label: "Cài đặt", icon: Settings, to: "/settings" },
];

const adminNavigation = [
  { label: "Tổng quan", icon: LayoutDashboard, to: "/admin" },
  { label: "Quản trị", icon: Users, to: "/admin/manage" },
  { label: "Kiểm duyệt cộng đồng", icon: ShieldAlert, to: "/admin/community" },
  { label: "Cộng đồng", icon: Users, to: "/community" },
  { label: "Cài đặt", icon: Settings, to: "/settings" },
];

export default function Sidebar({ user, displayName, initials }: SidebarProps) {
  const { role } = useUserRole();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const navigationId = useId();
  const navigationDialog = useRef<HTMLDialogElement>(null);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const account = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 901px)");
    const closeOnDesktop = () => {
      if (desktop.matches) navigationDialog.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !account.current?.contains(event.target)) setMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        account.current?.querySelector("button")?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);
  async function logout() {
    if (signingOut) return;
    setSigningOut(true); setSignOutError("");
    try {
      const result = await signOut();
      if (result.error) { setSignOutError(result.error); return; }
      navigate("/login", { replace: true });
    } catch { setSignOutError("Chưa thể đăng xuất. Vui lòng thử lại."); }
    finally { setSigningOut(false); }
  }
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
  const navigationItems = role === "admin"
    ? adminNavigation
    : role === "teacher"
      ? teacherNavigation
      : role === "student" ? [...studentNavigation, teacherApplication] : studentNavigation;
  const homePath = role ? dashboardByRole[role] : "/";
  const navigationLinks = (afterSelect?: () => void) => navigationItems.map(({ label, icon: Icon, to }) => (
    <NavLink className={({ isActive }) => `settings-nav-item${isActive ? " active" : ""}`}
      to={to} key={to} end onClick={afterSelect}>
      <Icon aria-hidden="true" size={18} />
      <span>{label}</span>
    </NavLink>
  ));

  return (
    <aside className="settings-sidebar">
      <div className="settings-sidebar-heading">
      <Link className="settings-brand" to={homePath} aria-label="LINEA - Tổng quan">
        <span className="settings-brand-name">LINEA</span>
        <span className="settings-brand-caption">Không gian học sáng tạo</span>
      </Link>
      <button type="button" className="settings-nav-toggle" aria-expanded={navigationOpen}
        aria-controls={navigationId} onClick={() => {
          setMenuOpen(false);
          navigationDialog.current?.showModal();
          setNavigationOpen(true);
        }}>
        <Menu size={18} aria-hidden="true" /> Menu
      </button>
      </div>

      <nav className="settings-navigation settings-navigation--desktop" aria-label="Điều hướng chính">
        {navigationLinks()}
      </nav>
      <dialog id={navigationId} ref={navigationDialog} className="settings-mobile-drawer" aria-label="Menu điều hướng"
        onClose={() => setNavigationOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) navigationDialog.current?.close();
        }}>
        <div className="settings-mobile-drawer-content">
          <header className="settings-mobile-drawer-heading">
            <span className="settings-brand-name">LINEA</span>
            <button type="button" className="settings-mobile-drawer-close" aria-label="Đóng menu"
              onClick={() => navigationDialog.current?.close()}><X size={20} aria-hidden="true" /></button>
          </header>
          <nav className="settings-navigation" aria-label="Điều hướng chính">
            {navigationLinks(() => navigationDialog.current?.close())}
          </nav>
        </div>
      </dialog>

      <div className="sidebar-account" ref={account}>
      <button type="button" className="sidebar-user sidebar-user-toggle" aria-label="Mở menu tài khoản" aria-expanded={menuOpen} aria-controls="sidebar-account-menu" onClick={() => {
        setMenuOpen(current => !current);
      }}>
        {profile?.avatar_url ? (
          <img className="avatar avatar-sidebar" src={profile.avatar_url} alt="" />
        ) : (
          <span className="avatar avatar-sidebar" aria-hidden="true">{sidebarInitials || initials}</span>
        )}
        <span className="sidebar-user-details">
          <span className="sidebar-user-name">{sidebarName}</span>
          <span className="sidebar-user-email">{user.email}</span>
        </span>
        <ChevronUp size={16} aria-hidden="true" />
      </button>
      {menuOpen && <div className="sidebar-account-menu" id="sidebar-account-menu">
        <Link to="/settings" onClick={() => setMenuOpen(false)}><Settings size={16} aria-hidden="true" /> Hồ sơ &amp; Cài đặt</Link>
        <button type="button" disabled={signingOut} onClick={() => void logout()}><LogOut size={16} aria-hidden="true" />{signingOut ? "Đang đăng xuất..." : "Đăng xuất"}</button>
        {signOutError && <p role="alert">{signOutError}</p>}
      </div>}
      </div>
    </aside>
  );
}
