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
  const [profileVersion, setProfileVersion] = useState(0);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    void syncRedirectLoginResult().catch((error: unknown) => {
      setAuthError(getAuthErrorMessage(error));
    });

    return subscribeAuthState((nextUser) => {
      setUser(nextUser);
      setStatus(nextUser ? "authenticated" : "guest");

      if (nextUser) {
        void syncUserProfile(nextUser).catch((error: unknown) => {
          setAuthError(getAuthErrorMessage(error));
        });
      }
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => {
      void profileVersion;

      return {
        authError,
        user,
        status,
        refreshUser: () => setProfileVersion((version) => version + 1),
        signIn: async () => {
          setAuthError(null);

          try {
            await signInWithGoogle();
          } catch (error) {
            setAuthError(getAuthErrorMessage(error));
          }
        },
        signOut: logout,
      };
    },
    [authError, user, status, profileVersion]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
