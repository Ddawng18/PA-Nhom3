import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "../auth/useAuth";
import { supabase } from "../lib/supabase";

const userRoleSchema = z.enum(["student", "teacher", "admin"]);

export type UserRole = z.infer<typeof userRoleSchema>;

type UserRoleState = {
  userId: string | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
};

export function useUserRole() {
  const { user } = useAuth();
  const [state, setState] = useState<UserRoleState>({
    userId: null,
    role: null,
    loading: false,
    error: null,
  });
  const userId = user?.id ?? null;

  useEffect(() => {
    let isCurrent = true;

    if (!userId) {
      setState({ userId: null, role: null, loading: false, error: null });
      return () => {
        isCurrent = false;
      };
    }

    const client = supabase;
    if (!client) {
      setState({
        userId,
        role: null,
        loading: false,
        error: "Ứng dụng chưa được cấu hình Supabase. Không thể xác định vai trò tài khoản.",
      });
      return () => {
        isCurrent = false;
      };
    }

    setState({ userId, role: null, loading: true, error: null });

    async function loadRole(activeClient: NonNullable<typeof supabase>) {
      try {
        const { data, error } = await activeClient
          .from("nguoi_dung")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        if (!isCurrent) return;

        if (error) {
          setState({
            userId,
            role: null,
            loading: false,
            error: "Không thể tải vai trò tài khoản. Vui lòng thử lại sau.",
          });
          return;
        }

        const parsedRole = userRoleSchema.safeParse(data?.role);
        if (!parsedRole.success) {
          setState({
            userId,
            role: null,
            loading: false,
            error: "Không tìm thấy vai trò hợp lệ cho tài khoản này.",
          });
          return;
        }

        setState({
          userId,
          role: parsedRole.data,
          loading: false,
          error: null,
        });
      } catch {
        if (!isCurrent) return;
        setState({
          userId,
          role: null,
          loading: false,
          error: "Không thể tải vai trò tài khoản. Vui lòng thử lại sau.",
        });
      }
    }

    void loadRole(client);

    return () => {
      isCurrent = false;
    };
  }, [userId]);

  const isCurrentUser = state.userId === userId;

  return {
    role: isCurrentUser ? state.role : null,
    loading: Boolean(userId) && (!isCurrentUser || state.loading),
    error: isCurrentUser ? state.error : null,
  };
}
