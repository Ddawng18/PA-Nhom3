import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import PublicHeader from "../components/PublicHeader";
import { listDemoOrders, type DemoOrder } from "../lib/demoOrders";
import "../styles/course-detail.css";

export default function DemoOrdersPage() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<DemoOrder[] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setOrders(null); setError("");
    if (session?.access_token) void listDemoOrders(session.access_token, controller.signal)
      .then((items) => { if (!controller.signal.aborted) setOrders(items); })
      .catch(() => { if (!controller.signal.aborted) setError("Không thể tải lịch sử đơn. Vui lòng thử lại."); });
    return () => controller.abort();
  }, [session?.access_token, retry]);
  const labels = { PENDING: "Chờ thanh toán", SUCCEEDED: "Thành công", FAILED: "Thất bại", CANCELLED: "Đã hủy" };
  return <div className="register-page cd-page"><PublicHeader authLink={{ to: "/dashboard", label: "Tổng quan" }} />
    <main className="cd-main cd-orders-main">
      <header className="cd-orders-header"><div><p className="cd-topic">TÀI KHOẢN CỦA BẠN</p><h1>Lịch sử thanh toán</h1><p>Theo dõi trạng thái các đơn đăng ký khóa học.</p></div>
        <span className="cd-payment-badge">Môi trường thử nghiệm · Không thu tiền thật</span>
      </header>
      {searchParams.get("payment") === "vnpay_return" && <p role="status">Đã quay lại từ VNPAY Sandbox. Đơn chỉ được xác nhận sau khi máy chủ nhận được thông báo thanh toán.</p>}
      {searchParams.get("payment") === "vnpay_invalid" && <p role="alert">Không thể xác minh kết quả trả về từ VNPAY. Trạng thái đơn trong danh sách vẫn là nguồn chính xác.</p>}
      {error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setRetry((v) => v + 1)}>Thử lại</button></div>
        : orders === null ? <p role="status">Đang tải đơn...</p>
        : orders.length === 0 ? <section className="cd-orders-empty"><span aria-hidden="true">₫</span><h2>Chưa có giao dịch</h2><p>Khi bạn đăng ký khóa học, đơn sẽ xuất hiện tại đây.</p><Link className="cd-button cd-button-primary" to="/courses">Khám phá khóa học</Link></section>
        : <ul className="cd-order-list">{orders.map((order) => <li className="cd-order-row" key={order.id}>
          <div className="cd-order-info"><strong><Link to={`/courses/${order.courseId}`}>{order.courseTitle}</Link></strong><span>Đơn #{order.id} · {new Date(order.createdAt).toLocaleString("vi-VN")}</span></div>
          <div className="cd-order-amount"><strong>{order.priceVnd.toLocaleString("vi-VN")} ₫</strong><span className={`cd-order-status cd-order-status-${order.status.toLowerCase()}`}>{labels[order.status]}</span></div>
        </li>)}</ul>}
    </main></div>;
}
