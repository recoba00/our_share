import {
  collection,
  onSnapshot,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { db } from "../../../lib/firebase/app";
import { getFirebaseErrorMessage } from "../../../lib/firebase/firebaseErrorMessage";
import type {
  AdminCrew,
  AdminCrewMember,
  AdminDashboardData,
  AdminPublicProfile,
} from "../types/adminDashboardTypes";

type DashboardKey = keyof AdminDashboardData;

const emptyDashboard: AdminDashboardData = {
  crews: [],
  members: [],
  profiles: [],
};

export function subscribeAdminDashboard({
  onChange,
  onError,
}: {
  onChange: (dashboard: AdminDashboardData) => void;
  onError?: (message: string) => void;
}) {
  let current = emptyDashboard;
  const ready = new Set<DashboardKey>();

  function update<Key extends DashboardKey>(key: Key, value: AdminDashboardData[Key]) {
    current = { ...current, [key]: value };
    ready.add(key);

    if (ready.size === 3) {
      onChange(current);
    }
  }

  const unsubscribes = [
    onSnapshot(
      collection(db, "publicProfiles"),
      (snapshot) => update("profiles", sortByCreatedAt(snapshot.docs.map(readPublicProfile))),
      (error) => onError?.(getFirebaseErrorMessage(error))
    ),
    onSnapshot(
      collection(db, "families"),
      (snapshot) => update("crews", sortByCreatedAt(snapshot.docs.map(readCrew))),
      (error) => onError?.(getFirebaseErrorMessage(error))
    ),
    onSnapshot(
      collection(db, "familyMembers"),
      (snapshot) => update("members", snapshot.docs.map(readCrewMember)),
      (error) => onError?.(getFirebaseErrorMessage(error))
    ),
  ];

  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
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

function readCrewMember(snapshot: QueryDocumentSnapshot<DocumentData>): AdminCrewMember {
  const data = snapshot.data();

  return {
    createdAt: readTimestamp(data.createdAt),
    familyId: typeof data.familyId === "string" ? data.familyId : "",
    nickname: typeof data.nickname === "string" ? data.nickname : "",
    role: data.role as AdminCrewMember["role"],
    updatedAt: readTimestamp(data.updatedAt),
    userId: typeof data.userId === "string" ? data.userId : "",
  };
}

function readTimestamp(value: unknown) {
  return value && typeof value === "object" && "toMillis" in value
    ? (value as Timestamp)
    : null;
}

function sortByCreatedAt<Item extends { createdAt: Timestamp | null }>(items: Item[]) {
  return [...items].sort(
    (first, second) =>
      (second.createdAt?.toMillis() ?? 0) - (first.createdAt?.toMillis() ?? 0)
  );
}
