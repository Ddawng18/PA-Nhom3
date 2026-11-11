import { currentEnrollmentStatus } from "../data/dashboardStatuses";

export type DashboardEnrollment = {
  ma_khoa_hoc: number | string;
  trang_thai: string;
  ngay_ghi_danh: string;
};

export function getGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "Chào buổi sáng";
  if (hour >= 11 && hour < 13) return "Chào buổi trưa";
  if (hour >= 13 && hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function getPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round(Math.min(Math.max(done, 0), total) / total * 100);
}

export function getCurrentLessonNumber(done: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.min(Math.max(done, 0) + 1, total);
}

export function formatLessonLabel(number: number): string {
  return `Bài ${String(Math.max(0, Math.trunc(number))).padStart(2, "0")}`;
}

export function formatLessonProgress(done: number, total: number): string {
  return `${Math.max(0, Math.trunc(done))}/${Math.max(0, Math.trunc(total))} bài · ${getPercent(done, total)}%`;
}

export function formatCourseMeta(teacherName: string | null, lessonCount: number): string {
  const lessons = `${Math.max(0, Math.trunc(lessonCount))} bài học`;
  return teacherName?.trim() ? `${teacherName.trim()} · ${lessons}` : lessons;
}

export function pickCurrentEnrollment<T extends DashboardEnrollment>(items: T[]): T | null {
  return items
    .filter((item) => item.trang_thai === currentEnrollmentStatus)
    .reduce<T | null>((latest, item) => {
      if (!latest || Date.parse(item.ngay_ghi_danh) > Date.parse(latest.ngay_ghi_danh)) {
        return item;
      }
      return latest;
    }, null);
}
