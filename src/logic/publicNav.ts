export const publicNavItems = [
  { label: "Tổng quan", to: "/" },
  { label: "Khóa học", to: "/courses" },
  { label: "Studio", to: "/studio" },
  { label: "Cộng đồng", to: "/community" },
] as const;

export type PublicNavItem = (typeof publicNavItems)[number];

export function isNavItemActive(pathname: string, item: PublicNavItem): boolean {
  if (!("to" in item)) return false;
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  if (item.to === "/courses") {
    return normalizedPath === "/courses" || normalizedPath.startsWith("/courses/");
  }
  return normalizedPath === item.to;
}
