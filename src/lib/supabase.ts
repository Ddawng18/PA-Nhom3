import { createClient } from "@supabase/supabase-js";
import { readRememberState, shouldKeepStoredSession } from "../auth/sessionPolicy";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const storageKey = isSupabaseConfigured ? `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token` : "";
const preferenceKey = "linea:remember-login";

function migrateLegacySession() {
  const state = readRememberState(localStorage, sessionStorage);
  if (state.remember || !shouldKeepStoredSession(true, state)) return;
  const legacy = localStorage.getItem(storageKey);
  if (!legacy) return;
  sessionStorage.setItem(preferenceKey, "0");
  sessionStorage.setItem(storageKey, legacy);
  localStorage.removeItem(storageKey);
}

if (isSupabaseConfigured) migrateLegacySession();

export function setRememberSession(remember: boolean) {
  sessionStorage.setItem(preferenceKey, remember ? "1" : "0");
}

function sessionStore(key: string) {
  if (key.endsWith("-code-verifier")) return sessionStorage;
  return sessionStorage.getItem(preferenceKey) === "0" ? sessionStorage : localStorage;
}

const authStorage = {
  getItem(key: string) {
    if (key.endsWith("-code-verifier")) return sessionStorage.getItem(key) ?? localStorage.getItem(key);
    if (sessionStore(key) === localStorage && localStorage.getItem(preferenceKey) === "0") return null;
    return sessionStore(key).getItem(key);
  },
  setItem(key: string, value: string) {
    const store = sessionStore(key);
    if (key === storageKey && store === localStorage) localStorage.removeItem(preferenceKey);
    store.setItem(key, value);
  },
  removeItem(key: string) {
    sessionStore(key).removeItem(key);
    if (key.endsWith("-code-verifier")) localStorage.removeItem(key);
  },
};

export function isCurrentAuthSession(accessToken: string | undefined) {
  const stored = authStorage.getItem(storageKey);
  if (!stored) return accessToken === undefined;
  try {
    return JSON.parse(stored).access_token === accessToken;
  } catch {
    return false;
  }
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        storage: authStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function getGoogleProviderStatus(): Promise<boolean | null> {
  if (!isSupabaseConfigured) return false;

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabaseAnonKey },
    });
    if (!response.ok) return null;

    const settings = await response.json();
    return Boolean(settings?.external?.google);
  } catch {
    return null;
  }
}
