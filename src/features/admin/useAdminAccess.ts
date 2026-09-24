import { useContext } from "react";
import { AdminAccessContext } from "./AdminAccessContext";

export function useAdminAccess() {
  const context = useContext(AdminAccessContext);

  if (!context) {
    throw new Error("useAdminAccess must be used within AdminAccessProvider");
  }

  return context;
}
