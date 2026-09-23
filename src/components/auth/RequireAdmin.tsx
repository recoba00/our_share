import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { isPlatformAdmin } from "../../features/admin/platformAdmin";
import { useAuth } from "../../features/auth/useAuth";

export function RequireAdmin({ children }: PropsWithChildren) {
  const { user } = useAuth();

  if (!isPlatformAdmin(user?.uid)) {
    return <Navigate replace to="/settings" />;
  }

  return children;
}
