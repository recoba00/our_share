import { CrownSimple } from "@phosphor-icons/react";
import type { FamilyRole } from "../../features/family/types/familyTypes";

export function FamilyRoleIndicator({
  className = "",
  role,
}: {
  className?: string;
  role: FamilyRole;
}) {
  if (role === "OWNER" || role === "VICE_OWNER") {
    const isOwner = role === "OWNER";

    return (
      <span
        aria-label={isOwner ? "크루장" : "부크루장"}
        className={`inline-flex size-5 shrink-0 items-center justify-center ${
          isOwner ? "text-amber-500" : "text-amber-700"
        } ${className}`}
        title={isOwner ? "크루장" : "부크루장"}
      >
        <CrownSimple aria-hidden="true" size={14} weight="fill" />
      </span>
    );
  }

  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full bg-[var(--color-surface)] px-2 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)] ${className}`}
    >
      멤버
    </span>
  );
}
