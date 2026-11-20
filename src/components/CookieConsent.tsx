import { useEffect, useState } from "react";
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
        <button className="button button-outline" type="button" onClick={() => choose("essential")}>
          Chỉ cookie cần thiết
        </button>
        <button className="button button-primary" type="button" onClick={() => choose("accepted")}>
          Chấp nhận
        </button>
      </div>
    </aside>
  );
}
