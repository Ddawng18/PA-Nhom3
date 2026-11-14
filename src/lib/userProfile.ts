import { z } from "zod";
import { supabase } from "./supabase";
import { requestAdminApi } from "./adminApi";

const profileSchema = z.object({
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
});

export type UserProfile = z.infer<typeof profileSchema>;

const profileChanged = "linea:profile-changed";
export function subscribeUserProfile(userId: string, listener: (profile: UserProfile) => void) {
  const handle = (event: Event) => {
    const { userId: savedUserId, profile } = (event as CustomEvent<{ userId: string; profile: UserProfile }>).detail;
    if (savedUserId === userId) listener(profile);
  };
  window.addEventListener(profileChanged, handle);
  return () => window.removeEventListener(profileChanged, handle);
}

export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error("Phiên đăng nhập đã hết hạn.");
  if (sessionData.session.user.id !== userId) throw new Error("Tài khoản đăng nhập đã thay đổi.");
  const data = await requestAdminApi("/api/profile/me", { token: sessionData.session.access_token });
  return profileSchema.parse(data);
}

export async function saveUserProfile(
  userId: string,
  profile: UserProfile
): Promise<UserProfile> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error("Phiên đăng nhập đã hết hạn.");
  if (sessionData.session.user.id !== userId) throw new Error("Tài khoản đăng nhập đã thay đổi.");
  const data = await requestAdminApi("/api/profile/me", {
    token: sessionData.session.access_token,
    method: "PUT",
    body: {
      display_name: profile.display_name?.trim() || null,
      avatar_url: profile.avatar_url?.trim() || null,
    },
  });
  const saved = profileSchema.parse(data);
  window.dispatchEvent(new CustomEvent(profileChanged, {
    detail: { userId: sessionData.session.user.id, profile: saved },
  }));
  return saved;
}
