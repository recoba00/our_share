import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type WriteBatch,
} from "firebase/firestore";
import { db } from "../../../lib/firebase/app";
import type { AdminDirectoryPage, AdminPageCursor } from "./adminDashboardService";
import type {
  AdminAuditAction,
  AdminAuditActor,
  AdminAuditLog,
  AdminAuditTargetType,
} from "../types/adminAuditTypes";

const pageSize = 25;
const auditCollection = collection(db, "adminAuditLogs");

export function appendAdminAuditLog({
  action,
  actor,
  batch,
  description,
  targetId,
  targetType,
}: {
  action: AdminAuditAction;
  actor: AdminAuditActor;
  batch: WriteBatch;
  description: string;
  targetId: string;
  targetType: AdminAuditTargetType;
}) {
  const auditRef = doc(auditCollection);
  batch.set(auditRef, {
    action,
    actorId: actor.id,
    actorRole: actor.role,
    createdAt: serverTimestamp(),
    description: description.trim(),
    id: auditRef.id,
    targetId,
    targetType,
  });
}

export async function loadAdminAuditLogsPage({
  cursor,
}: {
  cursor: AdminPageCursor;
}): Promise<AdminDirectoryPage<AdminAuditLog>> {
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
  if (cursor) {
    constraints.push(startAfter(cursor));
  }
  constraints.push(limit(pageSize + 1));

  const snapshot = await getDocs(query(auditCollection, ...constraints));
  const visibleDocuments = snapshot.docs.slice(0, pageSize);

  return {
    hasNext: snapshot.docs.length > pageSize,
    items: visibleDocuments.map(readAdminAuditLog),
    nextCursor: visibleDocuments.at(-1) ?? null,
  };
}

function readAdminAuditLog(
  snapshot: QueryDocumentSnapshot<DocumentData>
): AdminAuditLog {
  const data = snapshot.data();

  return {
    action: data.action as AdminAuditLog["action"],
    actorId: typeof data.actorId === "string" ? data.actorId : "",
    actorRole: data.actorRole as AdminAuditLog["actorRole"],
    createdAt:
      data.createdAt && typeof data.createdAt === "object" && "toMillis" in data.createdAt
        ? data.createdAt
        : null,
    description: typeof data.description === "string" ? data.description : "",
    id: snapshot.id,
    targetId: typeof data.targetId === "string" ? data.targetId : "",
    targetType: data.targetType as AdminAuditLog["targetType"],
  };
}
