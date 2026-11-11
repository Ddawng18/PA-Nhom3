import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "../lib/supabase";

const approvalSchema = z.object({ trang_thai: z.enum(["CHO_DUYET", "DA_DUYET", "TU_CHOI"]) });

type ApprovalState = {
  userId: string | null;
  status: "CHO_DUYET" | "DA_DUYET" | "TU_CHOI" | null;
  loading: boolean;
  error: string | null;
};

export function useTeacherApproval(userId: string | null) {
  const [state, setState] = useState<ApprovalState>({
    userId: null,
    status: null,
    loading: Boolean(userId),
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setState({ userId: null, status: null, loading: false, error: null });
      return () => {
        active = false;
      };
    }
    if (!supabase) {
      setState({
        userId,
        status: null,
        loading: false,
        error: "Ứng dụng chưa được cấu hình Supabase. Không thể kiểm tra hồ sơ giáo viên.",
      });
      return () => {
        active = false;
      };
    }
    setState({ userId, status: null, loading: true, error: null });
    void supabase
      .from("ho_so_giao_vien")
      .select("trang_thai")
      .eq("ma_nguoi_dung", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setState({
            userId,
            status: null,
            loading: false,
            error: "Không thể kiểm tra trạng thái duyệt giáo viên. Vui lòng thử lại.",
          });
          return;
        }
        const parsed = approvalSchema.safeParse(data);
        setState({
          userId,
          status: parsed.success ? parsed.data.trang_thai : null,
          loading: false,
          error: null,
        });
      }, () => {
        if (!active) return;
        setState({
          userId,
          status: null,
          loading: false,
          error: "Không thể kiểm tra trạng thái duyệt giáo viên. Vui lòng thử lại.",
        });
      });
    return () => {
      active = false;
    };
  }, [userId, attempt]);

  const matchesUser = state.userId === userId;
  return {
    status: matchesUser ? state.status : null,
    loading: Boolean(userId) && (!matchesUser || state.loading),
    error: matchesUser ? state.error : null,
    retry,
  };
}
