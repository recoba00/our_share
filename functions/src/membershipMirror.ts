export const FAMILY_MEMBER_ROLES = [
  "OWNER",
  "PARENT",
  "MEMBER",
  "CHILD",
] as const;

export type FamilyMemberRole = (typeof FAMILY_MEMBER_ROLES)[number];

export type FamilyMemberRecord = {
  familyId?: unknown;
  userId?: unknown;
  role?: unknown;
};

export type MembershipMirrorMutation = {
  path: string;
  data: {
    role: FamilyMemberRole;
    userId: string;
    updatedAt: number;
  };
};

function isFamilyMemberRole(value: unknown): value is FamilyMemberRole {
  return (
    typeof value === "string" &&
    (FAMILY_MEMBER_ROLES as readonly string[]).includes(value)
  );
}

export function buildMembershipMirror(
  record: FamilyMemberRecord | undefined,
  updatedAt = Date.now()
): MembershipMirrorMutation | null {
  if (
    typeof record?.familyId !== "string" ||
    record.familyId.length === 0 ||
    typeof record.userId !== "string" ||
    record.userId.length === 0 ||
    !isFamilyMemberRole(record.role) ||
    !Number.isFinite(updatedAt)
  ) {
    return null;
  }

  return {
    path: `familyMembers/${record.familyId}/${record.userId}`,
    data: {
      role: record.role,
      userId: record.userId,
      updatedAt,
    },
  };
}
