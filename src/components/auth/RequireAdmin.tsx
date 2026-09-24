import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { useAdminAccess } from "../../features/admin/useAdminAccess";

export function RequireAdmin({ children }: PropsWithChildren) {
  const { isAdmin, status } = useAdminAccess();

  if (status === "loading") {
    return (
      <div className="grid min-h-48 place-items-center">
        <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
          운영 권한을 확인하고 있어요.
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate replace to="/settings" />;
  }

  return children;
}
