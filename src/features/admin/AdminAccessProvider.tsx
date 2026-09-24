import { type PropsWithChildren, useEffect, useMemo, useState } from "react";
import { getPlatformAdminPermissions, type PlatformAdminRole } from "./types/platformAdminTypes";
import { isBootstrapPlatformAdmin } from "./platformAdmin";
import { subscribeMyPlatformAdminRole } from "./services/platformAdminService";
import { useAuth } from "../auth/useAuth";
import { AdminAccessContext } from "./AdminAccessContext";

type AccessState = {
  error: string;
  role: PlatformAdminRole | null;
  status: "loading" | "ready";
  userId: string;
};

export function AdminAccessProvider({ children }: PropsWithChildren) {
  const { status: authStatus, user } = useAuth();
  const isBootstrap = isBootstrapPlatformAdmin(user?.uid);
  const [state, setState] = useState<AccessState>({
    error: "",
    role: null,
    status: "loading",
    userId: "",
  });

  useEffect(() => {
    if (authStatus === "loading") {
      return;
    }

    if (!user || isBootstrapPlatformAdmin(user.uid)) {
      return;
    }

    return subscribeMyPlatformAdminRole({
      onChange: (role) => {
        setState({ error: "", role, status: "ready", userId: user.uid });
      },
      onError: (error) => {
        setState({ error, role: null, status: "ready", userId: user.uid });
      },
      userId: user.uid,
    });
  }, [authStatus, user]);

  const role = isBootstrap
    ? "SUPER_ADMIN"
    : user && state.userId === user.uid
      ? state.role
      : null;
  const resolvedStatus = authStatus === "loading"
    ? "loading"
    : !user || isBootstrap
      ? "ready"
      : state.userId !== user.uid
        ? "loading"
        : state.status;
  const value = useMemo(
    () => ({
      error: state.error,
      isAdmin: role !== null,
      isBootstrap,
      permissions: getPlatformAdminPermissions(role),
      role,
      status: resolvedStatus,
    }),
    [isBootstrap, resolvedStatus, role, state.error]
  );

  return <AdminAccessContext.Provider value={value}>{children}</AdminAccessContext.Provider>;
}
