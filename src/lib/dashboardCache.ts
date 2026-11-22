import type { LearnerAssignment, MyCourse } from "./learningApi";

export type DashboardSnapshot = {
  courses: MyCourse[];
  assignments: LearnerAssignment[];
  savedAt: string;
};

const PREFIX = "linea-dashboard-cache-v1";

function key(userId: string) {
  return `${PREFIX}:${userId}`;
}

export function loadDashboardSnapshot(userId: string | undefined): DashboardSnapshot | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const snapshot = parsed as Partial<DashboardSnapshot>;
    if (!Array.isArray(snapshot.courses) || !Array.isArray(snapshot.assignments) || typeof snapshot.savedAt !== "string") return null;
    return { courses: snapshot.courses, assignments: snapshot.assignments, savedAt: snapshot.savedAt };
  } catch {
    return null;
  }
}

export function saveDashboardSnapshot(userId: string, courses: MyCourse[], assignments: LearnerAssignment[]) {
  if (typeof window === "undefined") return;
  try {
    const snapshot: DashboardSnapshot = { courses, assignments, savedAt: new Date().toISOString() };
    window.localStorage.setItem(key(userId), JSON.stringify(snapshot));
  } catch {
    return;
  }
}
