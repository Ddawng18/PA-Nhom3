export type LearnerGoal = "habit" | "foundation" | "portfolio";
export type LearnerLevel = "CO_BAN" | "TRUNG_CAP" | "NANG_CAO";
export type PracticeTime = "15" | "30" | "60";

export type LearnerProfile = {
  goal: LearnerGoal;
  level: LearnerLevel;
  practiceTime: PracticeTime;
  completedAt: string;
};

const STORAGE_PREFIX = "linea-learner-profile-v1";

export const learnerGoals: Array<{ value: LearnerGoal; label: string; description: string }> = [
  { value: "habit", label: "Tạo thói quen", description: "Mỗi ngày một bài nhỏ, đều đặn." },
  { value: "foundation", label: "Xây nền tảng", description: "Hình khối, sắc độ và bố cục." },
  { value: "portfolio", label: "Làm portfolio", description: "Hoàn thiện bài vẽ để giới thiệu." },
];

export const learnerLevels: Array<{ value: LearnerLevel; label: string; description: string }> = [
  { value: "CO_BAN", label: "Mới bắt đầu", description: "Chưa vẽ nhiều hoặc muốn ôn lại nền tảng." },
  { value: "TRUNG_CAP", label: "Đã có nền", description: "Biết dựng hình, muốn kiểm soát bài vẽ tốt hơn." },
  { value: "NANG_CAO", label: "Muốn biểu đạt", description: "Đã quen công cụ, muốn phát triển phong cách." },
];

export const practiceTimes: Array<{ value: PracticeTime; label: string; description: string }> = [
  { value: "15", label: "15 phút", description: "Một bài tập ngắn." },
  { value: "30", label: "30 phút", description: "Học và luyện một chặng." },
  { value: "60", label: "60 phút", description: "Một buổi luyện sâu." },
];

function key(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function valid(value: unknown): value is LearnerProfile {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<LearnerProfile>;
  return ["habit", "foundation", "portfolio"].includes(item.goal ?? "")
    && ["CO_BAN", "TRUNG_CAP", "NANG_CAO"].includes(item.level ?? "")
    && ["15", "30", "60"].includes(item.practiceTime ?? "")
    && typeof item.completedAt === "string";
}

export function loadLearnerProfile(userId: string | undefined): LearnerProfile | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return valid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLearnerProfile(userId: string, profile: Omit<LearnerProfile, "completedAt">) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key(userId), JSON.stringify({ ...profile, completedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export function getLevelLabel(level: LearnerLevel) {
  return learnerLevels.find((item) => item.value === level)?.label ?? "Mới bắt đầu";
}
