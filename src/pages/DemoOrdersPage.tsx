import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import PublicHeader from "../components/PublicHeader";
import { listDemoOrders, type DemoOrder } from "../lib/demoOrders";
import "../styles/course-detail.css";

export default function DemoOrdersPage() {
  const { session } = useAuth();
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
  const labels = { PENDING: "Chờ xác nhận", SUCCEEDED: "Thành công", FAILED: "Thất bại", CANCELLED: "Đã hủy" };
  return <div className="register-page cd-page"><PublicHeader authLink={{ to: "/dashboard", label: "Tổng quan" }} />
    <main className="cd-main"><h1>Lịch sử đơn</h1><p><strong>DEMO — KHÔNG THU TIỀN THẬT</strong></p>
      {error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setRetry((v) => v + 1)}>Thử lại</button></div>
        : orders === null ? <p role="status">Đang tải đơn...</p>
        : orders.length === 0 ? <p>Bạn chưa có đơn demo.</p>
        : <ul>{orders.map((order) => <li key={order.id}>
          Đơn #{order.id} · <Link to={`/courses/${order.courseId}`}>Khóa học #{order.courseId}</Link> · {order.priceVnd.toLocaleString("vi-VN")} ₫ · {labels[order.status]} · {new Date(order.createdAt).toLocaleString("vi-VN")}
        </li>)}</ul>}
    </main></div>;
}
