import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import PublicHeader from "../components/PublicHeader";
import { listDemoOrders, refreshZaloPayOrder, type DemoOrder } from "../lib/demoOrders";
import "../styles/course-detail.css";

export default function DemoOrdersPage() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<DemoOrder[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const [refreshing, setRefreshing] = useState<number | null>(null);
  const [invoice, setInvoice] = useState<DemoOrder | null>(null);
  const returnedOrder = searchParams.get("payment") === "zalopay_return" ? searchParams.get("orderId") : null;
  useEffect(() => {
    const controller = new AbortController();
    setOrders(null); setError(""); setNotice("");
    const token = session?.access_token;
    if (token) void (async () => {
      if (returnedOrder && /^\d+$/.test(returnedOrder) && Number.isSafeInteger(Number(returnedOrder))) {
        try { await refreshZaloPayOrder(token, Number(returnedOrder), controller.signal); }
        catch { if (!controller.signal.aborted) setNotice("Chưa kiểm tra được kết quả ZaloPay. Bạn vẫn có thể xem lịch sử và kiểm tra lại trạng thái đơn."); }
      }
      return listDemoOrders(token, controller.signal);
    })()
      .then((items) => { if (!controller.signal.aborted) setOrders(items); })
      .catch(() => { if (!controller.signal.aborted) setError("Không thể tải lịch sử đơn. Vui lòng thử lại."); });
    return () => controller.abort();
  }, [session?.access_token, retry, returnedOrder]);
  async function refresh(orderId: number) {
    if (!session || refreshing !== null) return;
    setRefreshing(orderId); setNotice("");
    try {
      const updated = await refreshZaloPayOrder(session.access_token, orderId);
      setOrders(items => items?.map(item => item.id === updated.id ? updated : item) ?? null);
    } catch { setNotice("Chưa kiểm tra được trạng thái thanh toán. Vui lòng thử lại."); }
    finally { setRefreshing(null); }
  }
  const labels = { PENDING: "Chờ thanh toán", SUCCEEDED: "Thành công", FAILED: "Thất bại", CANCELLED: "Đã hủy" };
  return <div className="register-page cd-page"><PublicHeader authLink={{ to: "/dashboard", label: "Tổng quan" }} />
    <main className="cd-main cd-orders-main">
      <header className="cd-orders-header"><div><p className="cd-topic">TÀI KHOẢN CỦA BẠN</p><h1>Lịch sử thanh toán</h1><p>Theo dõi trạng thái các đơn đăng ký khóa học.</p></div>
        <span className="cd-payment-badge">Môi trường thử nghiệm · Không thu tiền thật</span>
      </header>
      {searchParams.get("payment") === "vnpay_return" && <p role="status">Đã quay lại từ VNPAY Sandbox. Đơn chỉ được xác nhận sau khi máy chủ nhận được thông báo thanh toán.</p>}
      {searchParams.get("payment") === "vnpay_invalid" && <p role="alert">Không thể xác minh kết quả trả về từ VNPAY. Trạng thái đơn trong danh sách vẫn là nguồn chính xác.</p>}
      {returnedOrder && <p role="status">Đã quay lại từ ZaloPay sandbox. Nếu đơn vẫn chờ thanh toán, bấm Kiểm tra trạng thái.</p>}
      {notice && <p role="alert">{notice}</p>}
      {error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setRetry((v) => v + 1)}>Thử lại</button></div>
        : orders === null ? <p role="status">Đang tải đơn...</p>
        : orders.length === 0 ? <section className="cd-orders-empty"><span aria-hidden="true">₫</span><h2>Chưa có giao dịch</h2><p>Khi bạn đăng ký khóa học, đơn sẽ xuất hiện tại đây.</p><Link className="cd-button cd-button-primary" to="/courses">Khám phá khóa học</Link></section>
        : <ul className="cd-order-list">{orders.map((order) => <li className="cd-order-row" key={order.id}>
          <div className="cd-order-info"><strong><Link to={`/courses/${order.courseId}`}>{order.courseTitle}</Link></strong><span>Đơn #{order.id} · {new Date(order.createdAt).toLocaleString("vi-VN")}</span></div>
          <div className="cd-order-amount"><strong>{order.priceVnd.toLocaleString("vi-VN")} ₫</strong><span className={`cd-order-status cd-order-status-${order.status.toLowerCase()}`}>{order.paymentProvider === "ZALOPAY_SANDBOX" && order.status === "PENDING" && Date.now() - new Date(order.createdAt).getTime() >= 15 * 60_000 ? "Quá hạn · chờ đối soát" : labels[order.status]}</span></div>
          {order.status === "SUCCEEDED" && <button type="button" className="cd-order-invoice" onClick={() => setInvoice(order)}>Hóa đơn</button>}
          {order.paymentProvider === "ZALOPAY_SANDBOX" && order.status === "PENDING" && <div className="cd-order-payment-actions">
            {order.paymentUrl && <a className="cd-button" href={order.paymentUrl}>Tiếp tục với ZaloPay sandbox</a>}
            <button type="button" className="cd-button" disabled={refreshing !== null} onClick={() => void refresh(order.id)}>{refreshing === order.id ? "Đang kiểm tra..." : "Kiểm tra trạng thái"}</button>
          </div>}
        </li>)}</ul>}
      {invoice && <InvoiceDialog order={invoice} close={() => setInvoice(null)} />}
    </main></div>;
}

function InvoiceDialog({ order, close }: { order: DemoOrder; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return <dialog className="cd-invoice-dialog" ref={ref} aria-labelledby="invoice-title" onClose={close}>
    <div className="cd-invoice-print">
      <header><div><p className="cd-topic">LINEA</p><h2 id="invoice-title">Hóa đơn học phí</h2></div><span>#{order.id}</span></header>
      <dl>
        <div><dt>Khóa học</dt><dd>{order.courseTitle}</dd></div>
        <div><dt>Ngày giao dịch</dt><dd>{new Date(order.createdAt).toLocaleString("vi-VN")}</dd></div>
        <div><dt>Phương thức</dt><dd>{order.paymentProvider === "ZALOPAY_SANDBOX" ? "ZaloPay sandbox" : order.paymentProvider === "VNPAY_SANDBOX" ? "VNPAY sandbox" : "Demo"}</dd></div>
        <div><dt>Trạng thái</dt><dd>Đã thanh toán</dd></div>
      </dl>
      <p className="cd-invoice-total"><span>Tổng cộng</span><strong>{order.priceVnd.toLocaleString("vi-VN")} ₫</strong></p>
      <p className="cd-invoice-note">Hóa đơn minh họa cho môi trường thử nghiệm. Không phải chứng từ thu tiền thật.</p>
    </div>
    <div className="cd-invoice-actions"><button type="button" className="cd-button" onClick={() => window.print()}>In hóa đơn</button><button type="button" className="cd-button cd-button-primary" onClick={() => ref.current?.close()}>Đóng</button></div>
  </dialog>;
}
