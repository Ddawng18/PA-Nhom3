import type { UserRole } from "../hooks/useUserRole";
import type { User } from "@supabase/supabase-js";
import { getUserChip as createUserChip, type UserChip, type UserDisplayProfile } from "../lib/userDisplay";

export const NOTIFICATION_TYPES = {
  lesson: "bai_hoc",
  advertisement: "quang_cao",
  message: "loi_nhan",
  system: "he_thong",
  teacherApproval: "duyet_ho_so",
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

export type NotificationItem = {
  ma_thong_bao: number | string;
  loai_thong_bao: string;
  noi_dung: string;
  duong_dan_lien_ket: string | null;
  da_doc: boolean;
  ngay_tao: string;
};

const allowedTypes: Record<UserRole, NotificationType[]> = {
  student: [
    NOTIFICATION_TYPES.lesson,
    NOTIFICATION_TYPES.advertisement,
    NOTIFICATION_TYPES.message,
    NOTIFICATION_TYPES.system,
  ],
  teacher: [
    NOTIFICATION_TYPES.lesson,
    NOTIFICATION_TYPES.system,
    NOTIFICATION_TYPES.message,
  ],
  admin: [
    NOTIFICATION_TYPES.teacherApproval,
    NOTIFICATION_TYPES.system,
  ],
};

export function getAllowedTypes(role: UserRole): NotificationType[] {
  return [...allowedTypes[role]];
}

export function filterForRole(
  role: UserRole,
  items: NotificationItem[]
): NotificationItem[] {
  const permitted = new Set(getAllowedTypes(role));
  return items.filter((item) => permitted.has(item.loai_thong_bao as NotificationType));
}

export function countUnread(items: NotificationItem[]): number {
  return items.filter((item) => !item.da_doc).length;
}

export function buildBannerStats(
  items: NotificationItem[]
): { unread: number; total: number; fillPercent: number } {
  const unread = countUnread(items);
  const total = items.length;
  return { unread, total, fillPercent: total === 0 ? 0 : (unread / total) * 100 };
}

export function getNotificationTitle(type: string, role: UserRole): string | null {
  if (!getAllowedTypes(role).includes(type as NotificationType)) return null;
  if (type === NOTIFICATION_TYPES.lesson) return "Bài học mới";
  if (type === NOTIFICATION_TYPES.advertisement) return "Quảng cáo";
  if (type === NOTIFICATION_TYPES.system) return "Thông báo hệ thống";
  if (type === NOTIFICATION_TYPES.teacherApproval) return "Duyệt hồ sơ giáo viên";
  if (type === NOTIFICATION_TYPES.message) {
    return role === "student" ? "Lời nhắn từ giảng viên" : "Lời nhắn từ học viên";
  }
  return null;
}

export function formatRelativeTime(now: Date, date: string | Date): string {
  const createdAt = date instanceof Date ? date : new Date(date);
  const difference = now.getTime() - createdAt.getTime();
  if (!Number.isFinite(difference)) return "";
  if (difference < 60_000) return "Vừa xong";
  if (difference < 60 * 60_000) return `${Math.floor(difference / 60_000)} phút trước`;

  const sameDay = now.getFullYear() === createdAt.getFullYear()
    && now.getMonth() === createdAt.getMonth()
    && now.getDate() === createdAt.getDate();
  if (sameDay) return "Hôm nay";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    yesterday.getFullYear() === createdAt.getFullYear()
    && yesterday.getMonth() === createdAt.getMonth()
    && yesterday.getDate() === createdAt.getDate()
  ) {
    return "Hôm qua";
  }

  const day = createdAt.getDate();
  const month = createdAt.getMonth() + 1;
  return createdAt.getFullYear() === now.getFullYear()
    ? `${day}/${month}`
    : `${day}/${month}/${createdAt.getFullYear()}`;
}

export function getSafeInternalLink(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }
  return value;
}

export function getUserChip(
  user: Pick<User, "email" | "user_metadata">,
  profile?: UserDisplayProfile | null
): UserChip {
  return createUserChip(user, profile);
}
