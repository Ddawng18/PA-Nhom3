import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getAuthErrorMessage } from "./errors";
import { AuthContext, type AuthContextValue, type AuthResult } from "./authContext";
import {
  getGoogleProviderStatus,
  isSupabaseConfigured,
  supabase,
} from "../lib/supabase";

const configurationError = "Ứng dụng chưa được cấu hình Supabase. Vui lòng thử lại sau.";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      let remember = true;
      let tabMarker = true;
      try {
        remember = localStorage.getItem("linea:remember-login") !== "0";
        tabMarker = sessionStorage.getItem("linea:tab-session") === "1";
      } catch {
        remember = true;
      }
      if (data.session && !remember && !tabMarker) {
        void supabase?.auth.signOut();
        setSession(null);
      } else {
        setSession(data.session);
      }
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setSession(null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onSessionExpired = () => {
      try { sessionStorage.setItem("linea:session-expired", "1"); } catch { void 0; }
      if (supabase) void supabase?.auth.signOut();
    };
    window.addEventListener("linea:session-expired", onSessionExpired);
    return () => window.removeEventListener("linea:session-expired", onSessionExpired);
  }, []);

  const unavailable = (): AuthResult => ({ error: configurationError });

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    configured: isSupabaseConfigured,
    signInWithEmail: async ({ email, password }) => {
      if (!supabase) return unavailable();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? getAuthErrorMessage(error.message) : null };
    },
    signInWithGoogle: async () => {
      if (!supabase) return unavailable();

      const googleEnabled = await getGoogleProviderStatus();
      if (googleEnabled === false) {
        return {
          error:
            "Đăng nhập Google chưa được bật trong Supabase. Vui lòng bật provider Google trong dashboard.",
        };
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
      });

      return { error: error ? getAuthErrorMessage(error.message) : null };
    },
    signUpWithEmail: async ({ email, password, displayName }) => {
      if (!supabase) return unavailable();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      return {
        error: error ? getAuthErrorMessage(error.message) : null,
        needsEmailConfirmation: !error && !data.session,
      };
    },
    resendConfirmation: async (email) => {
      if (!supabase) return unavailable();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      return { error: error ? getAuthErrorMessage(error.message) : null };
    },
    resetPassword: async (email) => {
      if (!supabase) return unavailable();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error ? getAuthErrorMessage(error.message) : null };
    },
    updatePassword: async (newPassword) => {
      if (!supabase) return unavailable();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error: error ? getAuthErrorMessage(error.message) : null };
    },
    signOut: async () => {
      if (!supabase) return unavailable();
      const { error } = await supabase.auth.signOut();
      try {
        sessionStorage.removeItem("linea:tab-session");
        localStorage.removeItem("linea:remember-login");
      } catch { void 0; }
      return { error: error ? getAuthErrorMessage(error.message) : null };
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
