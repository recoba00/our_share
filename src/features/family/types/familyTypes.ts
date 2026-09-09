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
  userId: string;
  role: FamilyRole;
  nickname: string;
  relation: string;
  permissions: string[];
  createdAt: unknown;
};
