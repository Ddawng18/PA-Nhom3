import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartProvider";

type Props = { courseId: number; className?: string };

export default function AddToCartButton({ courseId, className = "" }: Props) {
  const { courseIds, add } = useCart();
  const [busy, setBusy] = useState(false);
  const inCart = courseIds.includes(courseId);

  if (inCart) {
    return <Link className={`add-to-cart is-added ${className}`.trim()} to="/cart" aria-label="Xem giỏ hàng">Trong giỏ</Link>;
  }

  return <button
    className={`add-to-cart ${className}`.trim()}
    type="button"
    disabled={busy}
    onClick={async () => {
      setBusy(true);
      try { await add(courseId); } finally { setBusy(false); }
    }}
  >
    {busy ? "Đang thêm..." : "Thêm vào giỏ"}
  </button>;
}
