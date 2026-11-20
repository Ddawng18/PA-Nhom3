import { useEffect, useState } from "react";
import Button from "./ui/Button";
import "../styles/cookie-consent.css";

const STORAGE_KEY = "linea-cookie-consent-v1";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(!localStorage.getItem(STORAGE_KEY));
    } catch {
      setVisible(true);
    }
  }, []);

  function choose(value: "essential" | "accepted") {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      setVisible(false);
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside className="cookie-consent" role="region" aria-label="Thông báo cookie">
      <p>
        LINEA dùng cookie cần thiết để giữ phiên đăng nhập và ghi nhớ lựa chọn của bạn.
        Chúng tôi không dùng cookie quảng cáo.
      </p>
      <div className="cookie-consent-actions">
        <Button variant="outline" onClick={() => choose("essential")}>
          Chỉ cookie cần thiết
        </Button>
        <Button variant="primary" onClick={() => choose("accepted")}>
          Chấp nhận
        </Button>
      </div>
    </aside>
  );
}
