import { type PropsWithChildren, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  getAuthErrorMessage,
  logout,
  signInWithGoogle,
  subscribeAuthState,
  syncRedirectLoginResult,
  syncUserProfile,
} from "./services/authService";
import { AuthContext } from "./AuthContext";
import type { AuthContextValue, AuthStatus } from "./types/authTypes";

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    void syncRedirectLoginResult().catch((error: unknown) => {
      setAuthError(getAuthErrorMessage(error));
    });

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
      authError,
      user,
      status,
      signIn: async () => {
        setAuthError(null);

        try {
          await signInWithGoogle();
        } catch (error) {
          setAuthError(getAuthErrorMessage(error));
        }
      },
      signOut: logout,
    }),
    [authError, user, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
