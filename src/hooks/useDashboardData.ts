import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { loadMyCourses, learningError } from "../lib/learningApi";

export type DashboardCourse = {
  id: string;
  title: string;
  level: string | null;
  teacherName: string | null;
  totalLessons: number;
  completedLessons: number;
  percent: number;
};
export type DashboardData = { course: DashboardCourse | null; completedLessonCount: number };
type State = { userId: string | null; data: DashboardData | null; loading: boolean; error: string | null };

export function useDashboardData(userId: string | null) {
  const { session } = useAuth(); const token = session?.access_token;
  const [state, setState] = useState<State>({ userId: null, data: null, loading: true, error: null });
  useEffect(() => {
    if (!token || !userId) return;
    const controller = new AbortController();
    setState({ userId, data: null, loading: true, error: null });
    void loadMyCourses(token, controller.signal).then(courses => {
      if (controller.signal.aborted) return;
      const current = courses.find(c => c.available && c.status === "DANG_HOC") ?? courses.find(c => c.available);
      setState({ userId, loading: false, error: null, data: {
        course: current ? { id: String(current.id), title: current.title, level: current.level, teacherName: null,
          totalLessons: current.totalLessons, completedLessons: current.completedLessons, percent: current.percent } : null,
        completedLessonCount: courses.reduce((sum, c) => sum + c.completedLessons, 0),
      } });
    }).catch(e => { if (!controller.signal.aborted) setState({ userId, data: null, loading: false, error: learningError(e) }); });
    return () => controller.abort();
  }, [token, userId]);
  const current = state.userId === userId;
  return { data: current ? state.data : null, loading: Boolean(userId) && (!current || state.loading), error: current ? state.error : null };
}
