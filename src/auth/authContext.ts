import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AuthResult = { error: string | null; needsEmailConfirmation?: boolean };

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInWithEmail: (input: { email: string; password: string }) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signUpWithEmail: (input: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<AuthResult>;
  resendConfirmation: (email: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
