import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  writeBatch,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../../../lib/firebase/app";
import { getFirebaseErrorMessage } from "../../../lib/firebase/firebaseErrorMessage";
import type {
  ServiceNotice,
  ServiceNoticeDraft,
} from "../types/serviceNoticeTypes";
import { appendAdminAuditLog } from "./adminAuditService";
import type { AdminAuditActor } from "../types/adminAuditTypes";

const serviceNoticesCollection = collection(db, "serviceNotices");

export function subscribePublishedServiceNotices({
  onChange,
  onError,
}: {
  onChange: (notices: ServiceNotice[]) => void;
  onError?: (message: string) => void;
}) {
  return onSnapshot(
    query(serviceNoticesCollection, where("status", "==", "PUBLISHED")),
    (snapshot) => onChange(sortNotices(snapshot.docs.map(readServiceNotice))),
    (error) => onError?.(getFirebaseErrorMessage(error))
  );
}

export function subscribeAdminServiceNotices({
  onChange,
  onError,
}: {
  onChange: (notices: ServiceNotice[]) => void;
  onError?: (message: string) => void;
}) {
  return onSnapshot(
    serviceNoticesCollection,
    (snapshot) => onChange(sortNotices(snapshot.docs.map(readServiceNotice))),
    (error) => onError?.(getFirebaseErrorMessage(error))
  );
}

export async function createServiceNotice({
  actor,
  draft,
}: {
  actor: AdminAuditActor;
  draft: ServiceNoticeDraft;
}) {
  const noticeRef = doc(serviceNoticesCollection);
  const normalizedDraft = normalizeDraft(draft);
  const batch = writeBatch(db);
  batch.set(noticeRef, {
    ...normalizedDraft,
    createdAt: serverTimestamp(),
    createdBy: actor.id,
    id: noticeRef.id,
    publishedAt: normalizedDraft.status === "PUBLISHED" ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
  appendAdminAuditLog({
    action: "NOTICE_CREATE",
    actor,
    batch,
    description: `‘${normalizedDraft.title}’ 공지를 작성했어요.`,
    targetId: noticeRef.id,
    targetType: "NOTICE",
  });
  await batch.commit();
}

export async function updateServiceNotice({
  actor,
  draft,
  noticeId,
}: {
  actor: AdminAuditActor;
  draft: ServiceNoticeDraft;
  noticeId: string;
}) {
  const normalizedDraft = normalizeDraft(draft);
  const batch = writeBatch(db);
  batch.update(doc(db, "serviceNotices", noticeId), {
    ...normalizedDraft,
    publishedAt: normalizedDraft.status === "PUBLISHED" ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
  appendAdminAuditLog({
    action: "NOTICE_UPDATE",
    actor,
    batch,
    description: `‘${normalizedDraft.title}’ 공지를 수정했어요.`,
    targetId: noticeId,
    targetType: "NOTICE",
  });
  await batch.commit();
}

export async function deleteServiceNotice({
  actor,
  noticeId,
  title,
}: {
  actor: AdminAuditActor;
  noticeId: string;
  title: string;
}) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "serviceNotices", noticeId));
  appendAdminAuditLog({
    action: "NOTICE_DELETE",
    actor,
    batch,
    description: `‘${title.trim()}’ 공지를 삭제했어요.`,
    targetId: noticeId,
    targetType: "NOTICE",
  });
  await batch.commit();
}

function normalizeDraft(draft: ServiceNoticeDraft): ServiceNoticeDraft {
  const title = draft.title.trim();
  const body = draft.body.trim();

  if (!title) {
    throw new Error("공지 제목을 적어주세요.");
  }

  if (!body) {
    throw new Error("공지 내용을 적어주세요.");
  }

  if (title.length > 80) {
    throw new Error("공지 제목은 80자까지 작성할 수 있어요.");
  }

  if (body.length > 2000) {
    throw new Error("공지 내용은 2,000자까지 작성할 수 있어요.");
  }

  return { body, status: draft.status, title };
}

function readServiceNotice(snapshot: QueryDocumentSnapshot<DocumentData>): ServiceNotice {
  const data = snapshot.data();

  return {
    body: data.body as string,
    createdAt: data.createdAt ?? null,
    createdBy: data.createdBy as string,
    id: snapshot.id,
    publishedAt: data.publishedAt ?? null,
    status: data.status as ServiceNotice["status"],
    title: data.title as string,
    updatedAt: data.updatedAt ?? null,
  };
}

function sortNotices(notices: ServiceNotice[]) {
  return [...notices].sort((first, second) => {
    const firstTime = first.publishedAt?.toMillis() ?? first.updatedAt?.toMillis() ?? 0;
    const secondTime = second.publishedAt?.toMillis() ?? second.updatedAt?.toMillis() ?? 0;
    return secondTime - firstTime;
  });
}
