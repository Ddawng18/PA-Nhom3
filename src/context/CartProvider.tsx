import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { addCartItem, clearCart, loadCart, mergeCart, removeCartItem } from "../lib/cartApi";

const GUEST_KEY = "linea-cart-guest-v1";
const MAX_ITEMS = 20;

type CartContextValue = {
  courseIds: number[];
  count: number;
  loading: boolean;
  error: string;
  add: (courseId: number) => Promise<boolean>;
  remove: (courseId: number) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

function readGuest(): number[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(GUEST_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is number => Number.isSafeInteger(id) && id > 0).slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

function writeGuest(ids: number[]) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(ids.slice(0, MAX_ITEMS))); } catch { /* localStorage unavailable */ }
}

function clearGuest() {
  try { localStorage.removeItem(GUEST_KEY); } catch { /* localStorage unavailable */ }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [courseIds, setCourseIds] = useState<number[]>(() => readGuest());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mergedFor = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setCourseIds(readGuest());
      return;
    }
    setLoading(true);
    setError("");
    try {
      const quote = await loadCart(token);
      setCourseIds(quote.items.map(item => item.courseId));
    } catch {
      setError("Không tải được giỏ hàng.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setCourseIds(readGuest());
      mergedFor.current = null;
      return;
    }
    setLoading(true);
    setError("");
    const guest = readGuest();
    const load = async () => {
      try {
        const quote = guest.length
          ? await mergeCart(token, guest)
          : await loadCart(token);
        if (!cancelled) {
          setCourseIds(quote.items.map(item => item.courseId));
          if (guest.length) clearGuest();
        }
      } catch {
        if (!cancelled) setError("Không đồng bộ được giỏ hàng.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (mergedFor.current !== token) {
      mergedFor.current = token;
      void load();
    }
    return () => { cancelled = true; };
  }, [token]);

  async function add(courseId: number) {
    if (!Number.isSafeInteger(courseId) || courseId <= 0) return false;
    if (!token) {
      const next = Array.from(new Set([...readGuest(), courseId])).slice(0, MAX_ITEMS);
      setCourseIds(next);
      writeGuest(next);
      return true;
    }
    try {
      const quote = await addCartItem(token, courseId);
      setCourseIds(quote.items.map(item => item.courseId));
      setError("");
      return quote.items.some(item => item.courseId === courseId);
    } catch {
      setError("Không thêm được khóa học vào giỏ.");
      return false;
    }
  }

  async function remove(courseId: number) {
    if (!token) {
      const next = readGuest().filter(id => id !== courseId);
      setCourseIds(next);
      writeGuest(next);
      return;
    }
    try {
      const quote = await removeCartItem(token, courseId);
      setCourseIds(quote.items.map(item => item.courseId));
    } catch {
      setError("Không xóa được khóa học khỏi giỏ.");
    }
  }

  async function clear() {
    if (!token) {
      setCourseIds([]);
      clearGuest();
      return;
    }
    try {
      await clearCart(token);
      setCourseIds([]);
    } catch {
      setError("Không xóa được giỏ hàng.");
    }
  }

  useEffect(() => {
    const sync = () => void refresh();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, [refresh]);

  return <CartContext.Provider value={{ courseIds, count: courseIds.length, loading, error, add, remove, clear, refresh }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart phải được dùng bên trong CartProvider.");
  return value;
}
