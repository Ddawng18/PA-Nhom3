import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import type { UserRole } from "./useUserRole";
import {
  filterForRole,
  getAllowedTypes,
  type NotificationItem,
} from "../logic/notifications";
import { supabase } from "../lib/supabase";

const notificationRowSchema = z.object({
  ma_thong_bao: z.union([
    z.number().int(),
    z.string().regex(/^\d+$/),
  ]),
  loai_thong_bao: z.string(),
  noi_dung: z.string(),
  duong_dan_lien_ket: z.string().nullable(),
  da_doc: z.boolean(),
  ngay_tao: z.string().datetime({ offset: true }),
});

type NotificationsState = {
  key: string | null;
  items: NotificationItem[];
  loading: boolean;
  error: string | null;
};

const loadErrorMessage = "Không thể tải thông báo. Vui lòng thử lại sau.";
const invalidDataMessage = "Dữ liệu thông báo không hợp lệ. Vui lòng thử lại sau.";
const updateErrorMessage = "Không thể cập nhật trạng thái thông báo. Vui lòng thử lại sau.";

export function useNotifications(userId: string | null, role: UserRole | null) {
  const [state, setState] = useState<NotificationsState>({
    key: null,
    items: [],
    loading: false,
    error: null,
  });
  const [retryCount, setRetryCount] = useState(0);
  const requestIdRef = useRef(0);
  const requestKey = userId && role ? `${userId}:${role}` : null;

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let isCurrent = true;

    if (!userId || !role || !requestKey) {
      setState({ key: null, items: [], loading: false, error: null });
      return () => {
        isCurrent = false;
      };
    }

    const client = supabase;
    if (!client) {
      setState({ key: requestKey, items: [], loading: false, error: loadErrorMessage });
      return () => {
        isCurrent = false;
      };
    }

    setState({ key: requestKey, items: [], loading: true, error: null });

    async function loadNotifications(
      activeClient: NonNullable<typeof supabase>,
      activeUserId: string,
      activeRole: UserRole,
      activeKey: string,
      activeRequestId: number
    ) {
      try {
        const { data, error } = await activeClient
          .from("thong_bao")
          .select("ma_thong_bao, loai_thong_bao, noi_dung, duong_dan_lien_ket, da_doc, ngay_tao")
          .eq("ma_nguoi_dung", activeUserId)
          .in("loai_thong_bao", getAllowedTypes(activeRole))
          .order("ngay_tao", { ascending: false })
          .limit(100);

        if (!isCurrent || requestIdRef.current !== activeRequestId) return;
        if (error) {
          setState({ key: activeKey, items: [], loading: false, error: loadErrorMessage });
          return;
        }

        const parsedRows = (data ?? []).map((row) => notificationRowSchema.safeParse(row));
        if (parsedRows.some((result) => !result.success)) {
          setState({ key: activeKey, items: [], loading: false, error: invalidDataMessage });
          return;
        }

        const items = parsedRows.flatMap((result) => result.success ? [result.data] : []);
        setState({
          key: activeKey,
          items: filterForRole(activeRole, items),
          loading: false,
          error: null,
        });
      } catch {
        if (!isCurrent || requestIdRef.current !== activeRequestId) return;
        setState({ key: activeKey, items: [], loading: false, error: loadErrorMessage });
      }
    }

    void loadNotifications(client, userId, role, requestKey, requestId);

    return () => {
      isCurrent = false;
    };
  }, [requestKey, retryCount, role, userId]);

  async function markRead(id: NotificationItem["ma_thong_bao"]): Promise<void> {
    const client = supabase;
    const requestId = requestIdRef.current;
    if (!client || !userId || !role || !requestKey || requestId === 0) return;
    const previous = state.items.find((item) => item.ma_thong_bao === id);
    if (!previous || previous.da_doc) return;

    setState((current) => current.key === requestKey
      ? {
          ...current,
          items: current.items.map((item) => item.ma_thong_bao === id
            ? { ...item, da_doc: true }
            : item),
          error: null,
        }
      : current);

    try {
      const { error } = await client
        .from("thong_bao")
        .update({ da_doc: true })
        .eq("ma_thong_bao", id)
        .eq("ma_nguoi_dung", userId);

      if (requestIdRef.current !== requestId) return;
      if (error) throw error;
    } catch {
      if (requestIdRef.current !== requestId) return;
      setState((current) => current.key === requestKey
        ? {
            ...current,
            items: current.items.map((item) => item.ma_thong_bao === id
              ? { ...item, da_doc: previous.da_doc }
              : item),
            error: updateErrorMessage,
          }
        : current);
    }
  }

  async function markAllRead(): Promise<void> {
    const client = supabase;
    const requestId = requestIdRef.current;
    if (!client || !userId || !role || !requestKey || requestId === 0) return;
    const unreadItems = state.items.filter((item) => !item.da_doc);
    if (unreadItems.length === 0) return;

    const unreadIds = new Set(unreadItems.map((item) => item.ma_thong_bao));
    setState((current) => current.key === requestKey
      ? {
          ...current,
          items: current.items.map((item) => unreadIds.has(item.ma_thong_bao)
            ? { ...item, da_doc: true }
            : item),
          error: null,
        }
      : current);

    try {
      const { error } = await client
        .from("thong_bao")
        .update({ da_doc: true })
        .eq("ma_nguoi_dung", userId)
        .eq("da_doc", false)
        .in("loai_thong_bao", getAllowedTypes(role));

      if (requestIdRef.current !== requestId) return;
      if (error) throw error;
    } catch {
      if (requestIdRef.current !== requestId) return;
      setState((current) => current.key === requestKey
        ? {
            ...current,
            items: current.items.map((item) => {
              const previous = unreadItems.find((unreadItem) => unreadItem.ma_thong_bao === item.ma_thong_bao);
              return previous ? { ...item, da_doc: previous.da_doc } : item;
            }),
            error: updateErrorMessage,
          }
        : current);
    }
  }

  const matchesCurrentRequest = state.key === requestKey;

  return {
    items: matchesCurrentRequest ? state.items : [],
    loading: Boolean(requestKey) && (!matchesCurrentRequest || state.loading),
    error: matchesCurrentRequest ? state.error : null,
    markRead,
    markAllRead,
    retry: () => setRetryCount((current) => current + 1),
  };
}
