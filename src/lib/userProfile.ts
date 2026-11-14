import { z } from "zod";
import { supabase } from "./supabase";
import { requestAdminApi } from "./adminApi";

const profileSchema = z.object({
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
});

export type UserProfile = z.infer<typeof profileSchema>;

export async function loadUserProfile(_userId: string): Promise<UserProfile | null> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error("Phiên đăng nhập đã hết hạn.");
  const data = await requestAdminApi("/api/profile/me", { token: sessionData.session.access_token });
  return profileSchema.parse(data);
}

export async function saveUserProfile(
  _userId: string,
  profile: UserProfile
): Promise<UserProfile> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error("Phiên đăng nhập đã hết hạn.");
  const data = await requestAdminApi("/api/profile/me", {
    token: sessionData.session.access_token,
    method: "PUT",
    body: {
      display_name: profile.display_name?.trim() || null,
      avatar_url: profile.avatar_url?.trim() || null,
    },
  });
  return profileSchema.parse(data);
}
