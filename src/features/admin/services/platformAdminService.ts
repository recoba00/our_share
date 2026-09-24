import { ref, remove, set } from "firebase/database";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db, realtimeDb } from "../../../lib/firebase/app";
import { getFirebaseErrorMessage } from "../../../lib/firebase/firebaseErrorMessage";
import { appendAdminAuditLog } from "./adminAuditService";
import type { AdminAuditActor } from "../types/adminAuditTypes";
import type {
  PlatformAdminAssignment,
  PlatformAdminRole,
} from "../types/platformAdminTypes";

const rolesCollection = collection(db, "platformAdminRoles");

export function subscribeMyPlatformAdminRole({
  onChange,
  onError,
  userId,
}: {
  onChange: (role: PlatformAdminRole | null) => void;
  onError: (message: string) => void;
  userId: string;
}) {
  return onSnapshot(
    doc(rolesCollection, userId),
    (snapshot) => {
      onChange(snapshot.exists() ? (snapshot.data().role as PlatformAdminRole) : null);
    },
    (error) => onError(getFirebaseErrorMessage(error))
  );
}

export async function loadPlatformAdminAssignments() {
  const snapshot = await getDocs(query(rolesCollection, orderBy("createdAt", "asc")));
  return snapshot.docs.map(readPlatformAdminAssignment);
}

export async function savePlatformAdminRole({
  actor,
  currentAssignment,
  role,
  userId,
}: {
  actor: AdminAuditActor;
  currentAssignment: PlatformAdminAssignment | null;
  role: PlatformAdminRole;
  userId: string;
}) {
  const mirrorRef = ref(realtimeDb, `platformAdminRoles/${userId}`);
  await set(mirrorRef, { role, updatedAt: Date.now(), userId });

  const batch = writeBatch(db);
  const roleRef = doc(rolesCollection, userId);
  if (currentAssignment) {
    batch.update(roleRef, { role, updatedAt: serverTimestamp() });
  } else {
    batch.set(roleRef, {
      createdAt: serverTimestamp(),
      createdBy: actor.id,
      id: userId,
      role,
      updatedAt: serverTimestamp(),
      userId,
    });
  }
  appendAdminAuditLog({
    action: currentAssignment ? "ADMIN_ROLE_UPDATE" : "ADMIN_ROLE_ASSIGN",
    actor,
    batch,
    description: `${userId}의 관리자 권한을 설정했어요.`,
    targetId: userId,
    targetType: "ADMIN_ROLE",
  });

  try {
    await batch.commit();
  } catch (error) {
    if (currentAssignment) {
      await set(mirrorRef, {
        role: currentAssignment.role,
        updatedAt: Date.now(),
        userId,
      }).catch(() => undefined);
    } else {
      await remove(mirrorRef).catch(() => undefined);
    }
    throw error;
  }
}

export async function removePlatformAdminRole({
  actor,
  assignment,
}: {
  actor: AdminAuditActor;
  assignment: PlatformAdminAssignment;
}) {
  const mirrorRef = ref(realtimeDb, `platformAdminRoles/${assignment.userId}`);
  await remove(mirrorRef);

  const batch = writeBatch(db);
  batch.delete(doc(rolesCollection, assignment.userId));
  appendAdminAuditLog({
    action: "ADMIN_ROLE_REMOVE",
    actor,
    batch,
    description: `${assignment.userId}의 관리자 권한을 해제했어요.`,
    targetId: assignment.userId,
    targetType: "ADMIN_ROLE",
  });

  try {
    await batch.commit();
  } catch (error) {
    await set(mirrorRef, {
      role: assignment.role,
      updatedAt: Date.now(),
      userId: assignment.userId,
    }).catch(() => undefined);
    throw error;
  }
}

function readPlatformAdminAssignment(
  snapshot: QueryDocumentSnapshot<DocumentData>
): PlatformAdminAssignment {
  const data = snapshot.data();
  const readTimestamp = (value: unknown) =>
    value && typeof value === "object" && "toMillis" in value ? value : null;

  return {
    createdAt: readTimestamp(data.createdAt) as PlatformAdminAssignment["createdAt"],
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
    id: snapshot.id,
    role: data.role as PlatformAdminRole,
    updatedAt: readTimestamp(data.updatedAt) as PlatformAdminAssignment["updatedAt"],
    userId: typeof data.userId === "string" ? data.userId : snapshot.id,
  };
}
