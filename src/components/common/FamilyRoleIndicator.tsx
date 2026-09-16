import { CrownSimple } from "@phosphor-icons/react";
import type { FamilyRole } from "../../features/family/types/familyTypes";

export function FamilyRoleIndicator({
  className = "",
  role,
}: {
  className?: string;
  role: FamilyRole | "MEMBER";
}) {
  if (role === "OWNER") {
    return (
      <span
        aria-label="크루장"
        className={`inline-grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand ${className}`}
        title="크루장"
      >
        <CrownSimple aria-hidden="true" size={16} weight="regular" />
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
