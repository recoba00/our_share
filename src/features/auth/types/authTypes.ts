import type { User } from "firebase/auth";

export type AuthStatus = "loading" | "authenticated" | "guest";

export type AuthContextValue = {
  authError: string | null;
  user: User | null;
  status: AuthStatus;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};
