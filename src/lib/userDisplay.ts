import type { User } from "@supabase/supabase-js";

export type UserDisplayProfile = {
  display_name?: string | null;
  avatar_url?: string | null;
};

export type UserChip = {
  name: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
};

type UserDisplaySource = Pick<User, "email" | "user_metadata">;

function getMetadataString(user: UserDisplaySource, key: string): string | null {
  const value = user.user_metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getDisplayName(
  user: UserDisplaySource,
  profile?: UserDisplayProfile | null
): string {
  return profile?.display_name?.trim()
    || getMetadataString(user, "display_name")
    || user.email?.split("@")[0]
    || "Tài khoản LINEA";
}

export function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

export function getUserChip(
  user: UserDisplaySource,
  profile?: UserDisplayProfile | null
): UserChip {
  const name = getDisplayName(user, profile);
  return {
    name,
    email: user.email ?? "",
    initials: getInitials(name),
    avatarUrl: profile?.avatar_url?.trim() || getMetadataString(user, "avatar_url"),
  };
}
