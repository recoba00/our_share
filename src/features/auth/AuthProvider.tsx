import { type PropsWithChildren, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  logout,
  signInWithGoogle,
  subscribeAuthState,
  syncUserProfile,
} from "./services/authService";
import { AuthContext } from "./AuthContext";
import type { AuthContextValue, AuthStatus } from "./types/authTypes";

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    return subscribeAuthState(async (nextUser) => {
      setUser(nextUser);
      setStatus(nextUser ? "authenticated" : "guest");

      if (nextUser) {
        await syncUserProfile(nextUser);
      }
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      signIn: async () => {
        await signInWithGoogle();
      },
      signOut: logout,
    }),
    [user, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
