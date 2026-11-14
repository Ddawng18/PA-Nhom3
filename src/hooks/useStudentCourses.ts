import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { loadStudentCourses, type StudentCourse } from "../lib/studentCourses";

type State = { userId: string | null; courses: StudentCourse[]; loading: boolean; error: string | null };

export function useStudentCourses(userId: string) {
  const [state, setState] = useState<State>({ userId: null, courses: [], loading: true, error: null });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ userId, courses: [], loading: true, error: null });
    if (!supabase) {
      setState({ userId, courses: [], loading: false, error: "Chưa cấu hình kết nối dữ liệu khóa học." });
      return () => controller.abort();
    }
    void loadStudentCourses(supabase, userId, controller.signal).then(courses => {
      if (!controller.signal.aborted) setState({ userId, courses, loading: false, error: null });
    }).catch(() => {
      if (!controller.signal.aborted) setState({
        userId, courses: [], loading: false, error: "Không thể tải khóa học đã đăng ký. Vui lòng thử lại.",
      });
    });
    return () => controller.abort();
  }, [userId, attempt]);
  const current = state.userId === userId;
  return { courses: current ? state.courses : [], loading: !current || state.loading,
    error: current ? state.error : null, retry };
}
