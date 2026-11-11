import { useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { useUserRole } from "../hooks/useUserRole";
import { useNotifications } from "../hooks/useNotifications";
import { getDisplayName, getInitials } from "../lib/userDisplay";
import {
  buildBannerStats,
  formatRelativeTime,
  getNotificationTitle,
  getSafeInternalLink,
  type NotificationItem,
} from "../logic/notifications";
import "../styles/global.css";
import "../styles/settings.css";
import "../styles/notifications.css";

type NotificationFilter = "all" | "unread";

function NotificationCard({
  item,
  title,
  onActivate,
}: {
  item: NotificationItem;
  title: string;
  onActivate: (item: NotificationItem) => void;
}) {
  return (
    <button
      className={`notif-card${item.da_doc ? " notif-card-read" : " notif-card-unread"}`}
      type="button"
      onClick={() => onActivate(item)}
      aria-label={`${title}. ${item.noi_dung}`}
    >
      <span className="notif-card-dot" aria-hidden="true" />
      <span className="notif-card-copy">
        <span className="notif-card-title">{title}</span>
        <span className="notif-card-message">{item.noi_dung}</span>
        <span className="notif-card-time">{formatRelativeTime(new Date(), item.ngay_tao)}</span>
      </span>
    </button>
  );
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const roleState = useUserRole();
  const {
    items,
    loading: notificationsLoading,
    error: notificationsError,
    markRead,
    markAllRead,
    retry,
  } = useNotifications(user?.id ?? null, roleState.role);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [bannerImageAvailable, setBannerImageAvailable] = useState(true);
  const navigate = useNavigate();

  if (!user) return null;

  const displayName = getDisplayName(user);
  const role = roleState.role;
  const visibleItems = filter === "unread" ? items.filter((item) => !item.da_doc) : items;
  const stats = buildBannerStats(items);

  function activateNotification(item: NotificationItem) {
    void markRead(item.ma_thong_bao);
    const destination = getSafeInternalLink(item.duong_dan_lien_ket);
    if (destination) navigate(destination);
  }

  const loading = roleState.loading || notificationsLoading;
  const roleError = !roleState.loading && !role
    ? roleState.error ?? "Không thể xác định vai trò tài khoản."
    : null;

  return (
    <div className="settings-shell notif-page">
      <Sidebar user={user} displayName={displayName} initials={getInitials(displayName)} />
      <main className="settings-main">
        <div className="settings-content">
          <header className="settings-page-heading">
            <div>
              <p className="settings-eyebrow">THÔNG BÁO · HOẠT ĐỘNG</p>
              <h1>Thông báo</h1>
              <p>Theo dõi bài học mới, nhắc nộp bài và phản hồi từ cộng đồng.</p>
            </div>
            <div className="settings-heading-actions">
              <button
                className="button button-outline my-courses-bell notif-bell"
                type="button"
                aria-label="Thông báo"
                aria-current="page"
              >
                <Bell aria-hidden="true" size={18} />
              </button>
            </div>
          </header>
          {loading ? (
            <p className="notif-state-card" role="status">Đang tải thông báo...</p>
          ) : roleError ? (
            <p className="notif-state-card notif-state-error" role="alert">{roleError}</p>
          ) : notificationsError ? (
            <section className="notif-state-card notif-state-error" role="alert">
              <p>{notificationsError}</p>
              <button className="button button-outline notif-retry-button" type="button" onClick={retry}>
                Thử lại
              </button>
            </section>
          ) : role ? (
            <>
              <section className="notif-banner" aria-label="Tổng quan thông báo">
                <span className="notif-banner-dot notif-banner-dot-one" aria-hidden="true" />
                <span className="notif-banner-dot notif-banner-dot-two" aria-hidden="true" />
                <span className="notif-banner-dash" aria-hidden="true" />
                <div className="notif-banner-copy">
                  <div className="notif-banner-main">
                    <p className="notif-banner-message">Bạn có {stats.unread} thông báo chưa đọc.</p>
                    <div className="notif-banner-actions">
                      <button
                        className="notif-mark-all-button"
                        type="button"
                        disabled={stats.unread === 0}
                        onClick={() => void markAllRead()}
                      >
                        Đánh dấu tất cả đã đọc
                      </button>
                      <div className="notif-banner-stats">
                        <span className="notif-unread-count" aria-live="polite">
                          {stats.unread} chưa đọc
                        </span>
                        <span
                          className="notif-progress"
                          role="progressbar"
                          aria-label="Tỷ lệ thông báo chưa đọc"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={stats.fillPercent}
                        >
                          <span style={{ width: `${stats.fillPercent}%` }} />
                        </span>
                        <span className="notif-total-count">{stats.total} thông báo mới</span>
                      </div>
                    </div>
                  </div>
                </div>
                {bannerImageAvailable && (
                  <img
                    className="notif-banner-image"
                    src="/images/notifications-banner.png"
                    alt=""
                    aria-hidden="true"
                    onError={() => setBannerImageAvailable(false)}
                  />
                )}
              </section>
              <nav className="settings-tabs notif-tabs" aria-label="Lọc thông báo">
                <button
                  className={`settings-tab${filter === "all" ? " active" : ""}`}
                  type="button"
                  aria-current={filter === "all" ? "page" : undefined}
                  onClick={() => setFilter("all")}
                >
                  Tất cả ({stats.total})
                </button>
                <button
                  className={`settings-tab${filter === "unread" ? " active" : ""}`}
                  type="button"
                  aria-current={filter === "unread" ? "page" : undefined}
                  onClick={() => setFilter("unread")}
                >
                  Chưa đọc ({stats.unread})
                </button>
              </nav>
              {visibleItems.length > 0 ? (
                <div className="notif-list" aria-label="Danh sách thông báo">
                  {visibleItems.map((item) => (
                    <NotificationCard
                      key={item.ma_thong_bao}
                      item={item}
                      title={getNotificationTitle(item.loai_thong_bao, role) ?? "Thông báo"}
                      onActivate={activateNotification}
                    />
                  ))}
                </div>
              ) : (
                <p className="notif-state-card notif-empty" role="status">
                  {filter === "unread" ? "Bạn đã đọc hết thông báo." : "Chưa có thông báo nào."}
                </p>
              )}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
