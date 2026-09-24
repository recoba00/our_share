import { ref, remove, set } from "firebase/database";
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { db, realtimeDb } from "../../../lib/firebase/app";
import { getFirebaseErrorMessage } from "../../../lib/firebase/firebaseErrorMessage";
import type { AdminDirectoryPage, AdminPageCursor } from "../../admin/services/adminDashboardService";
import type {
  ModerationReport,
  ModerationReportDraft,
  ModerationReportStatus,
  UserRestriction,
  UserRestrictionReason,
} from "../types/moderationTypes";

const pageSize = 25;
const reportCollection = collection(db, "moderationReports");
const reportQueueCollection = collection(db, "moderationReportQueue");

export async function createModerationReport({
  draft,
  familyId,
  familyName,
  reporterId,
  reporterName,
}: {
  draft: ModerationReportDraft;
  familyId: string | null;
  familyName: string | null;
  reporterId: string;
  reporterName: string;
}) {
  const reportRef = doc(reportCollection);
  const payload = {
    createdAt: serverTimestamp(),
    details: draft.details.trim(),
    familyId,
    familyName,
    id: reportRef.id,
    reason: draft.reason,
    reporterId,
    reporterName: reporterName.trim() || "사용자",
    resolutionNote: "",
    reviewedAt: null,
    reviewedBy: null,
    status: "OPEN" as const,
    targetLabel: draft.targetLabel.trim(),
    targetType: draft.targetType,
    targetUserId: draft.targetUserId?.trim() || null,
    updatedAt: serverTimestamp(),
  };
  const batch = writeBatch(db);
  batch.set(reportRef, payload);
  batch.set(doc(reportQueueCollection, reportRef.id), payload);
  await batch.commit();
}

export async function loadModerationReportsPage({
  cursor,
  view,
}: {
  cursor: AdminPageCursor;
  view: "QUEUE" | "HISTORY";
}): Promise<AdminDirectoryPage<ModerationReport>> {
  const source = view === "QUEUE" ? reportQueueCollection : reportCollection;
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
  if (cursor) {
    constraints.push(startAfter(cursor));
  }
  constraints.push(limit(pageSize + 1));

  const snapshot = await getDocs(query(source, ...constraints));
  const visibleDocuments = snapshot.docs.slice(0, pageSize);

  return {
    hasNext: snapshot.docs.length > pageSize,
    items: visibleDocuments.map(readModerationReport),
    nextCursor: visibleDocuments.at(-1) ?? null,
  };
}

export async function resolveModerationReport({
  reportId,
  resolutionNote,
  reviewedBy,
  status,
}: {
  reportId: string;
  resolutionNote: string;
  reviewedBy: string;
  status: Exclude<ModerationReportStatus, "OPEN">;
}) {
  const batch = writeBatch(db);
  batch.update(doc(reportCollection, reportId), {
    resolutionNote: resolutionNote.trim(),
    reviewedAt: serverTimestamp(),
    reviewedBy,
    status,
    updatedAt: serverTimestamp(),
  });
  batch.delete(doc(reportQueueCollection, reportId));
  await batch.commit();
}

export async function loadUserRestrictions(userIds: string[]) {
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
      getDocs(
        query(collection(db, "userRestrictions"), where(documentId(), "in", ids))
      )
    )
  );

  return snapshots.flatMap((snapshot) => snapshot.docs.map(readUserRestriction));
}

export function subscribeMyRestriction({
  onChange,
  onError,
  userId,
}: {
  onChange: (restriction: UserRestriction | null) => void;
  onError: (message: string) => void;
  userId: string;
}) {
  return onSnapshot(
    doc(db, "userRestrictions", userId),
    (snapshot) => onChange(snapshot.exists() ? readUserRestriction(snapshot) : null),
    (error) => onError(getFirebaseErrorMessage(error))
  );
}

export async function restrictUser({
  createdBy,
  note,
  reason,
  userId,
}: {
  createdBy: string;
  note: string;
  reason: UserRestrictionReason;
  userId: string;
}) {
  const payload = {
    createdAt: serverTimestamp(),
    createdBy,
    id: userId,
    note: note.trim(),
    reason,
    updatedAt: serverTimestamp(),
    userId,
  };

  await setDoc(doc(db, "userRestrictions", userId), payload);
  try {
    await set(ref(realtimeDb, `restrictedUsers/${userId}`), {
      createdBy,
      reason,
      updatedAt: Date.now(),
      userId,
    });
  } catch (error) {
    await deleteDoc(doc(db, "userRestrictions", userId)).catch(() => undefined);
    throw error;
  }
}

export async function restoreUserAccess(userId: string) {
  await remove(ref(realtimeDb, `restrictedUsers/${userId}`));
  await deleteDoc(doc(db, "userRestrictions", userId));
}

function readModerationReport(
  snapshot: QueryDocumentSnapshot<DocumentData>
): ModerationReport {
  const data = snapshot.data();

  return {
    createdAt: readTimestamp(data.createdAt),
    details: typeof data.details === "string" ? data.details : "",
    familyId: typeof data.familyId === "string" ? data.familyId : null,
    familyName: typeof data.familyName === "string" ? data.familyName : null,
    id: snapshot.id,
    reason: data.reason as ModerationReport["reason"],
    reporterId: typeof data.reporterId === "string" ? data.reporterId : "",
    reporterName: typeof data.reporterName === "string" ? data.reporterName : "사용자",
    resolutionNote: typeof data.resolutionNote === "string" ? data.resolutionNote : "",
    reviewedAt: readTimestamp(data.reviewedAt),
    reviewedBy: typeof data.reviewedBy === "string" ? data.reviewedBy : null,
    status: data.status as ModerationReportStatus,
    targetLabel: typeof data.targetLabel === "string" ? data.targetLabel : "",
    targetType: data.targetType as ModerationReport["targetType"],
    targetUserId: typeof data.targetUserId === "string" ? data.targetUserId : null,
    updatedAt: readTimestamp(data.updatedAt),
  };
}

function readUserRestriction(snapshot: QueryDocumentSnapshot<DocumentData>): UserRestriction {
  const data = snapshot.data();

  return {
    createdAt: readTimestamp(data.createdAt),
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
    id: snapshot.id,
    note: typeof data.note === "string" ? data.note : "",
    reason: data.reason as UserRestrictionReason,
    updatedAt: readTimestamp(data.updatedAt),
    userId: typeof data.userId === "string" ? data.userId : snapshot.id,
  };
}

function readTimestamp(value: unknown) {
  return value && typeof value === "object" && "toMillis" in value
    ? (value as Timestamp)
    : null;
}
