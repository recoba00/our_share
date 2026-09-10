export type FamilyRole = "OWNER" | "PARENT" | "MEMBER" | "CHILD";

export type Family = {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  createdAt: unknown;
};

export type FamilyMember = {
  familyId: string;
  inviteCode?: string;
  userId: string;
  role: FamilyRole;
  nickname: string;
  relation: string;
  permissions: string[];
  createdAt: unknown;
};

export type FamilyMemberProfile = FamilyMember & {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};
