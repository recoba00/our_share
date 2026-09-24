import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
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
import {
  matchesAdminAuditFilters,
  type AdminAuditFilters,
} from "../utils/adminAuditFilters";

const pageSize = 25;
const pageScanBatchSize = 100;
const pageScanLimit = 1000;
const exportBatchSize = 250;
const exportRowLimit = 5000;
const exportScanLimit = 20000;
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
  filters,
}: {
  cursor: AdminPageCursor;
  filters: AdminAuditFilters;
}): Promise<AdminDirectoryPage<AdminAuditLog>> {
  const matches: {
    log: AdminAuditLog;
    snapshot: QueryDocumentSnapshot<DocumentData>;
  }[] = [];
  let scanCursor = cursor;
  let lastScannedCursor: AdminPageCursor = cursor;
  let scannedCount = 0;
  let exhausted = false;

  while (matches.length <= pageSize && scannedCount < pageScanLimit && !exhausted) {
    const batchLimit = Math.min(pageScanBatchSize, pageScanLimit - scannedCount);
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(query(
      auditCollection,
      ...buildAuditDateConstraints(filters),
      ...(scanCursor ? [startAfter(scanCursor)] : []),
      limit(batchLimit)
    ));

    if (snapshot.empty) {
      exhausted = true;
      break;
    }

    for (const documentSnapshot of snapshot.docs) {
      lastScannedCursor = documentSnapshot;
      scannedCount += 1;
      const log = readAdminAuditLog(documentSnapshot);

      if (matchesAdminAuditFilters(log, filters)) {
        matches.push({ log, snapshot: documentSnapshot });
      }

      if (matches.length > pageSize) {
        break;
      }
    }

    if (matches.length > pageSize) {
      break;
    }

    exhausted = snapshot.size < batchLimit;
    scanCursor = snapshot.docs.at(-1) ?? null;
  }

  const visibleMatches = matches.slice(0, pageSize);
  const hasBufferedMatch = matches.length > pageSize;
  const hasNext = hasBufferedMatch || (!exhausted && Boolean(lastScannedCursor));
  const nextCursor = hasBufferedMatch
    ? visibleMatches.at(-1)?.snapshot ?? null
    : hasNext
      ? lastScannedCursor
      : null;

  return {
    hasNext,
    items: visibleMatches.map(({ log }) => log),
    nextCursor,
  };
}

export async function loadAdminAuditLogsForExport({
  filters,
}: {
  filters: AdminAuditFilters;
}) {
  const items: AdminAuditLog[] = [];
  let scanCursor: AdminPageCursor = null;
  let scannedCount = 0;
  let exhausted = false;

  while (
    items.length < exportRowLimit &&
    scannedCount < exportScanLimit &&
    !exhausted
  ) {
    const batchLimit = Math.min(exportBatchSize, exportScanLimit - scannedCount);
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(query(
      auditCollection,
      ...buildAuditDateConstraints(filters),
      ...(scanCursor ? [startAfter(scanCursor)] : []),
      limit(batchLimit)
    ));

    if (snapshot.empty) {
      exhausted = true;
      break;
    }

    for (const documentSnapshot of snapshot.docs) {
      scannedCount += 1;
      const log = readAdminAuditLog(documentSnapshot);
      if (matchesAdminAuditFilters(log, filters)) {
        items.push(log);
      }
      if (items.length >= exportRowLimit) {
        break;
      }
    }

    exhausted = snapshot.size < batchLimit;
    scanCursor = snapshot.docs.at(-1) ?? null;
  }

  return {
    items,
    truncated: !exhausted,
  };
}

function buildAuditDateConstraints(filters: AdminAuditFilters): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];
  const startDate = parseLocalDate(filters.startDate);
  const endDate = parseLocalDate(filters.endDate);

  if (startDate) {
    constraints.push(where("createdAt", ">=", Timestamp.fromDate(startDate)));
  }

  if (endDate) {
    const exclusiveEndDate = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate() + 1
    );
    constraints.push(where("createdAt", "<", Timestamp.fromDate(exclusiveEndDate)));
  }

  constraints.push(orderBy("createdAt", "desc"));
  return constraints;
}

function parseLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
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
