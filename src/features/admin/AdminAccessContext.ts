import { createContext } from "react";
import type {
  PlatformAdminPermissions,
  PlatformAdminRole,
} from "./types/platformAdminTypes";

export type AdminAccessContextValue = {
  error: string;
  isAdmin: boolean;
  isBootstrap: boolean;
  permissions: PlatformAdminPermissions;
  role: PlatformAdminRole | null;
  status: "loading" | "ready";
};

export const AdminAccessContext = createContext<AdminAccessContextValue | null>(null);
