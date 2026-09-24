import {
  collection,
  documentId,
  endAt,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  startAt,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { db } from "../../../lib/firebase/app";
import type {
  AdminCrew,
  AdminDashboardData,
  AdminPublicProfile,
} from "../types/adminDashboardTypes";

export type AdminPageCursor = QueryDocumentSnapshot<DocumentData> | null;

export type AdminDirectoryPage<Item> = {
  hasNext: boolean;
  items: Item[];
  nextCursor: AdminPageCursor;
};

const directoryPageSize = 25;
const recentItemLimit = 5;

const profilesCollection = collection(db, "publicProfiles");
const crewsCollection = collection(db, "families");
const membersCollection = collection(db, "familyMembers");

export async function loadAdminDashboard(): Promise<AdminDashboardData> {
  const [userCount, crewCount, membershipCount, recentProfiles, recentCrews] =
    await Promise.all([
      getCountFromServer(profilesCollection),
      getCountFromServer(crewsCollection),
      getCountFromServer(membersCollection),
      getDocs(query(profilesCollection, orderBy("createdAt", "desc"), limit(recentItemLimit))),
      getDocs(query(crewsCollection, orderBy("createdAt", "desc"), limit(recentItemLimit))),
    ]);
  const crews = recentCrews.docs.map(readCrew);
  const [ownerProfiles, recentCrewMemberCounts] = await Promise.all([
    loadPublicProfilesByIds(crews.map((crew) => crew.ownerId)),
    loadCrewMemberCounts(crews.map((crew) => crew.id)),
  ]);

  return {
    crewCount: crewCount.data().count,
    membershipCount: membershipCount.data().count,
    ownerProfiles,
    recentCrewMemberCounts,
    recentCrews: crews,
    recentProfiles: recentProfiles.docs.map(readPublicProfile),
    userCount: userCount.data().count,
  };
}

export async function loadAdminProfilesPage({
  cursor,
  search,
}: {
  cursor: AdminPageCursor;
  search: string;
}): Promise<AdminDirectoryPage<AdminPublicProfile>> {
  const constraints: QueryConstraint[] = search
    ? [orderBy("displayName")]
    : [orderBy("createdAt", "desc")];

  if (cursor) {
    constraints.push(startAfter(cursor));
  } else if (search) {
    constraints.push(startAt(search));
  }

  if (search) {
    constraints.push(endAt(`${search}\uf8ff`));
  }

  constraints.push(limit(directoryPageSize + 1));
  const snapshot = await getDocs(query(profilesCollection, ...constraints));
  const visibleDocuments = snapshot.docs.slice(0, directoryPageSize);

  return {
    hasNext: snapshot.docs.length > directoryPageSize,
    items: visibleDocuments.map(readPublicProfile),
    nextCursor: visibleDocuments.at(-1) ?? null,
  };
}

export async function loadAdminCrewsPage({
  cursor,
  search,
}: {
  cursor: AdminPageCursor;
  search: string;
}): Promise<
  AdminDirectoryPage<AdminCrew> & {
    memberCounts: Record<string, number>;
    ownerProfiles: AdminPublicProfile[];
  }
> {
  const constraints: QueryConstraint[] = search
    ? [orderBy("name")]
    : [orderBy("createdAt", "desc")];

  if (cursor) {
    constraints.push(startAfter(cursor));
  } else if (search) {
    constraints.push(startAt(search));
  }

  if (search) {
    constraints.push(endAt(`${search}\uf8ff`));
  }

  constraints.push(limit(directoryPageSize + 1));
  const snapshot = await getDocs(query(crewsCollection, ...constraints));
  const visibleDocuments = snapshot.docs.slice(0, directoryPageSize);
  const crews = visibleDocuments.map(readCrew);
  const [ownerProfiles, memberCounts] = await Promise.all([
    loadPublicProfilesByIds(crews.map((crew) => crew.ownerId)),
    loadCrewMemberCounts(crews.map((crew) => crew.id)),
  ]);

  return {
    hasNext: snapshot.docs.length > directoryPageSize,
    items: crews,
    memberCounts,
    nextCursor: visibleDocuments.at(-1) ?? null,
    ownerProfiles,
  };
}

export async function loadUserCrewCounts(userIds: string[]) {
  const entries = await Promise.all(
    [...new Set(userIds)].map(async (userId) => {
      const snapshot = await getCountFromServer(
        query(membersCollection, where("userId", "==", userId))
      );
      return [userId, snapshot.data().count] as const;
    })
  );

  return Object.fromEntries(entries) as Record<string, number>;
}

async function loadCrewMemberCounts(crewIds: string[]) {
  const entries = await Promise.all(
    [...new Set(crewIds)].map(async (crewId) => {
      const snapshot = await getCountFromServer(
        query(membersCollection, where("familyId", "==", crewId))
      );
      return [crewId, snapshot.data().count] as const;
    })
  );

  return Object.fromEntries(entries) as Record<string, number>;
}

async function loadPublicProfilesByIds(userIds: string[]) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return [];
  }

  const chunks = Array.from(
    { length: Math.ceil(uniqueIds.length / 30) },
    (_, index) => uniqueIds.slice(index * 30, index * 30 + 30)
  );
  const snapshots = await Promise.all(
    chunks.map((ids) =>
      getDocs(query(profilesCollection, where(documentId(), "in", ids)))
    )
  );

  return snapshots.flatMap((snapshot) => snapshot.docs.map(readPublicProfile));
}

function readPublicProfile(
  snapshot: QueryDocumentSnapshot<DocumentData>
): AdminPublicProfile {
  const data = snapshot.data();

  return {
    createdAt: readTimestamp(data.createdAt),
    displayName: typeof data.displayName === "string" ? data.displayName : null,
    id: snapshot.id,
    photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
    updatedAt: readTimestamp(data.updatedAt),
  };
}

function readCrew(snapshot: QueryDocumentSnapshot<DocumentData>): AdminCrew {
  const data = snapshot.data();

  return {
    createdAt: readTimestamp(data.createdAt),
    id: snapshot.id,
    name: typeof data.name === "string" ? data.name : "이름 없는 크루",
    ownerId: typeof data.ownerId === "string" ? data.ownerId : "",
    updatedAt: readTimestamp(data.updatedAt),
  };
}

function readTimestamp(value: unknown) {
  return value && typeof value === "object" && "toMillis" in value
    ? (value as Timestamp)
    : null;
}
