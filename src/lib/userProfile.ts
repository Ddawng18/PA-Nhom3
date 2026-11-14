import { z } from "zod";
import { supabase } from "./supabase";

const profileSchema = z.object({
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
});

export type UserProfile = z.infer<typeof profileSchema>;

export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { data, error } = await supabase
    .from("nguoi_dung")
    .select("display_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data === null ? null : profileSchema.parse(data);
}

export async function saveUserProfile(
  userId: string,
  profile: UserProfile
): Promise<UserProfile> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { data, error } = await supabase
    .from("nguoi_dung")
    .update({
      display_name: profile.display_name?.trim() || null,
      avatar_url: profile.avatar_url?.trim() || null,
    })
    .eq("id", userId)
    .select("display_name, avatar_url")
    .single();
  if (error) throw error;
  return profileSchema.parse(data);
}
