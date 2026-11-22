import { useEffect, useState } from "react";
import { ArrowRight, ShoppingBag, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import PublicHeader from "../components/PublicHeader";
import { useCart } from "../context/CartProvider";
import { checkoutCart, quoteCart, type CartQuote } from "../lib/cartApi";
import { AdminApiError } from "../lib/adminApi";
import { createUuid } from "../logic/uuid";
import { setPageMeta } from "../lib/seo";
import "../styles/cart.css";

export default function CartPage() {
  const { user, session } = useAuth();
  const { courseIds, loading: cartLoading, error: cartError, remove, clear, refresh } = useCart();
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const token = session?.access_token;

  useEffect(() => {
    setPageMeta({
      title: "Giỏ hàng · LINEA",
      description: "Các khóa học bạn đã chọn, tổng tiền và thanh toán một lần.",
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (courseIds.length === 0) {
      setQuote(null);
      setError("");
      return () => controller.abort();
    }
    setLoading(true);
    setError("");
    void quoteCart(courseIds, token, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setQuote(data); })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được giỏ hàng.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [courseIds, token]);

  async function checkout() {
    if (!token || !user) {
      navigate("/login", { state: { from: "/cart" } });
      return;
    }
    if (!quote || quote.items.every(item => !item.available || item.enrolled) || busy) return;
    setBusy(true);
    setError("");
    const fingerprint = [...courseIds].sort((a, b) => a - b).join("-");
    const keyName = `linea-cart-checkout:${user.id}:${fingerprint}`;
    const key = sessionStorage.getItem(keyName) ?? createUuid();
    sessionStorage.setItem(keyName, key);
    try {
      const order = await checkoutCart(token, courseIds, key);
      sessionStorage.removeItem(keyName);
      if (order.paymentUrl) {
        window.location.assign(order.paymentUrl);
        return;
      }
      if (order.status === "SUCCEEDED") {
        await clear();
        navigate("/orders", { replace: true });
        return;
      }
      setError("Đơn đã được tạo nhưng chưa có liên kết thanh toán. Vui lòng kiểm tra lịch sử đơn hàng.");
    } catch (reason) {
      if (reason instanceof AdminApiError && reason.code === "ALREADY_ENROLLED") {
        setError("Một khóa học đã được ghi danh. Hãy xóa khóa đó khỏi giỏ và thử lại.");
      } else if (reason instanceof AdminApiError && reason.code === "CART_CHANGED") {
        setError("Một khóa học đã thay đổi hoặc không còn mở. Giỏ hàng đã được làm mới.");
        await refresh();
      } else {
        setError(reason instanceof Error ? reason.message : "Không thể tạo thanh toán.");
      }
    } finally {
      setBusy(false);
    }
  }

  const items = quote?.items ?? [];
  const payable = items.filter(item => item.available && !item.enrolled);
  const hasBlocked = items.some(item => !item.available || item.enrolled);

  return <div className="register-page cart-page">
    <PublicHeader authLink={{ to: "/login", label: "Đăng nhập" }} />
    <main className="cart-main">
      <header className="cart-header">
        <div><p className="guest-eyebrow">GIỎ HÀNG</p><h1>Khóa học của bạn</h1><p>Chọn nhiều khóa và thanh toán một lần. Giá được xác nhận lại từ LINEA.</p></div>
        <Link className="cart-continue" to="/courses">Tiếp tục khám phá <ArrowRight size={15} aria-hidden="true" /></Link>
      </header>

      {cartError && <p className="cart-alert" role="alert">{cartError}</p>}
      {error && <p className="cart-alert" role="alert">{error}</p>}
      {(cartLoading || loading) && <p className="cart-status" role="status">Đang tải giỏ hàng...</p>}

      {!cartLoading && !loading && courseIds.length === 0 && <section className="cart-empty">
        <span aria-hidden="true"><ShoppingBag size={34} /></span>
        <h2>Giỏ hàng đang trống</h2>
        <p>Thêm một khóa học để bắt đầu lộ trình của bạn.</p>
        <Link className="guest-cta" to="/courses">Khám phá khóa học</Link>
      </section>}

      {!loading && items.length > 0 && <div className="cart-layout">
        <section className="cart-items" aria-label="Khóa học trong giỏ">
          {items.map(item => <article className="cart-item" key={item.courseId}>
            <div className="cart-item-main">
              <p className="cart-item-topic">{item.level || "KHÓA HỌC"}</p>
              <h2>{item.title}</h2>
              <p className="cart-item-price">{item.priceVnd === 0 ? "Miễn phí" : `${item.priceVnd.toLocaleString("vi-VN")} ₫`}</p>
              {!item.available && <p className="cart-item-state is-blocked">Khóa học không còn mở để đăng ký.</p>}
              {item.enrolled && <p className="cart-item-state">Bạn đã sở hữu khóa này.</p>}
            </div>
            <button type="button" className="cart-remove" aria-label={`Xóa ${item.title} khỏi giỏ`} onClick={() => void remove(item.courseId)}><Trash2 size={16} aria-hidden="true" /></button>
          </article>)}
          <button type="button" className="cart-clear" onClick={() => void clear()}>Xóa tất cả</button>
        </section>

        <aside className="cart-summary">
          <p className="guest-section-label guest-section-label-left">TÓM TẮT</p>
          <dl>
            <div><dt>Khóa có thể mua</dt><dd>{payable.length}</dd></div>
            <div><dt>Tổng thanh toán</dt><dd className="cart-total">{(quote?.totalVnd ?? 0).toLocaleString("vi-VN")} ₫</dd></div>
          </dl>
          {hasBlocked && <p className="cart-summary-note">Một số khóa không thể thanh toán. Hãy xóa chúng để tiếp tục.</p>}
          {quote?.totalVnd === 0 && payable.length > 0 && <p className="cart-summary-note">Các khóa miễn phí sẽ được ghi danh ngay, không qua thanh toán.</p>}
          <button className="guest-cta cart-checkout" type="button" disabled={busy || !payable.length || hasBlocked} onClick={() => void checkout()}>
            {busy ? "Đang xử lý..." : user ? "Thanh toán một lần" : "Đăng nhập để thanh toán"}
          </button>
          <p className="cart-summary-foot">Thanh toán sandbox hiện không thu tiền thật.</p>
        </aside>
      </div>}
    </main>
  </div>;
}
