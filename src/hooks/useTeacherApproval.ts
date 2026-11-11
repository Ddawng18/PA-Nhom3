import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { getMyTeacherProfile, type TeacherProfile } from "../lib/teacherProfileApi";

export function useTeacherApproval(userId: string | null) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [state, setState] = useState<{ userId: string | null; status: TeacherProfile["status"] | null; loading: boolean; error: string | null }>({ userId: null, status: null, loading: false, error: null });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    if (!userId) { setState({ userId: null, status: null, loading: false, error: null }); return; }
    if (!token) { setState({ userId, status: null, loading: false, error: "Phiên đăng nhập đã hết hạn." }); return; }
    const controller = new AbortController();
    setState({ userId, status: null, loading: true, error: null });
    void getMyTeacherProfile(token, controller.signal).then(profile => {
      if (!controller.signal.aborted) setState({ userId, status: profile?.status ?? null, loading: false, error: null });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ userId, status: null, loading: false, error: "Không thể kiểm tra trạng thái hồ sơ. Vui lòng thử lại." });
    });
    return () => controller.abort();
  }, [userId, token, attempt]);
  return { status: state.userId === userId ? state.status : null,
    loading: Boolean(userId) && (state.userId !== userId || state.loading), error: state.userId === userId ? state.error : null, retry };
}
