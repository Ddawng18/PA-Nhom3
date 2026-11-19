import { createContext } from "react";

export type UserRole = "student" | "teacher" | "admin";
export const UserRoleContext = createContext<{
  role: UserRole | null;
  loading: boolean;
  error: string | null;
} | null>(null);
