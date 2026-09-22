import type { ReactNode } from "react";
import { Avatar } from "../common/Avatar";
import { FamilyRoleIndicator } from "../common/FamilyRoleIndicator";
import type { FamilyMemberProfile } from "../../features/family/types/familyTypes";

const roleLabels = {
  CHILD: "멤버",
  MEMBER: "멤버",
  OWNER: "크루장",
  PARENT: "멤버",
  VICE_OWNER: "부크루장",
} as const;

const roleBadgeClasses = {
  OWNER: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  VICE_OWNER: "bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300",
  MEMBER: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  PARENT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  CHILD: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
} as const;

export function CrewMemberRow({
  action,
  member,
}: {
  action?: ReactNode;
  member: FamilyMemberProfile;
}) {
  const memberName = member.displayName ?? member.nickname;

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 shadow-sm">
      <div className="relative size-9 shrink-0">
        <Avatar alt={memberName} className="size-9" src={member.photoURL} />
        {member.role === "OWNER" || member.role === "VICE_OWNER" ? (
          <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-[var(--color-surface)]">
            <FamilyRoleIndicator className="!size-4" role={member.role} />
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <p className="min-w-0 truncate text-sm">
          <strong>{memberName}</strong>
        </p>
        <span
          className={`inline-flex h-5 max-w-[5.5rem] shrink-0 items-center truncate rounded-full px-1.5 text-[10px] font-semibold leading-5 ${roleBadgeClasses[member.role]}`}
        >
          {roleLabels[member.role]}
        </span>
      </div>
      {action}
    </div>
  );
}
