import { useContext } from "react";
import { UserRoleContext } from "../auth/userRoleContext";
export type { UserRole } from "../auth/userRoleContext";

export function useUserRole() {
  const role = useContext(UserRoleContext);
  if (!role) throw new Error("useUserRole must be used within UserRoleProvider");
  return role;
}
