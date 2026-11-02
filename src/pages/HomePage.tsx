import { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import { getAuthErrorMessage } from "../auth/errors";
import { useAuth } from "../auth/useAuth";
import "../styles/home.css";

export default function HomePage() {
  const [message, setMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { user, signOut } = useAuth();
  const displayName = user?.user_metadata.display_name;
  const avatarUrl = user?.user_metadata.avatar_url;

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setMessage(null);
    try {
      const result = await signOut();
      if (result.error) setMessage(result.error);
    } catch (error) {
      setMessage(getAuthErrorMessage(error instanceof Error ? error.message : undefined));
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <AuthLayout authLink={{ to: "/", label: "LINEA" }}>
      <section className="register-panel home-panel" aria-labelledby="home-title">
        <p className="eyebrow">CHÀO MỪNG TRỞ LẠI</p>
        {typeof avatarUrl === "string" && (
          <img className="user-avatar" src={avatarUrl} alt="" />
        )}
        <h1 id="home-title">{typeof displayName === "string" ? displayName : "Tài khoản LINEA"}</h1>
        <p className="form-description">{user?.email}</p>
        {message && <p className="form-message form-message-error" role="alert">{message}</p>}
        <button className="submit-button" type="button" disabled={isSigningOut} onClick={handleSignOut}>
          {isSigningOut ? "Đang xử lý..." : "Đăng xuất"}
        </button>
      </section>
    </AuthLayout>
  );
}
