import type { Timestamp } from "firebase/firestore";
import type { FamilyRole } from "../../family/types/familyTypes";

export type AdminPublicProfile = {
  createdAt: Timestamp | null;
  displayName: string | null;
  id: string;
  photoURL: string | null;
  updatedAt: Timestamp | null;
};

export type AdminCrew = {
  createdAt: Timestamp | null;
  id: string;
  name: string;
  ownerId: string;
  updatedAt: Timestamp | null;
};

export type AdminCrewMember = {
  createdAt: Timestamp | null;
  familyId: string;
  nickname: string;
  role: FamilyRole;
  updatedAt: Timestamp | null;
  userId: string;
};

export type AdminDashboardData = {
  crewCount: number;
  membershipCount: number;
  ownerProfiles: AdminPublicProfile[];
  recentCrewMemberCounts: Record<string, number>;
  recentCrews: AdminCrew[];
  recentProfiles: AdminPublicProfile[];
  userCount: number;
};
