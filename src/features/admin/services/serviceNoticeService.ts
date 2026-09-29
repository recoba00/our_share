import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
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
export const ADMIN_NOTICE_PAGE_SIZE = 30;
export const PUBLISHED_NOTICE_PAGE_SIZE = 20;

export type ServiceNoticeCursor = QueryDocumentSnapshot<DocumentData> | null;

export type ServiceNoticePageInfo = {
  cursor: ServiceNoticeCursor;
  hasMore: boolean;
};

export type ServiceNoticePage = ServiceNoticePageInfo & {
  notices: ServiceNotice[];
};

export function subscribePublishedServiceNotices({
  limitCount = PUBLISHED_NOTICE_PAGE_SIZE,
  onChange,
  onError,
  onPageInfo,
}: {
  limitCount?: number;
  onChange: (notices: ServiceNotice[]) => void;
  onError?: (message: string) => void;
  onPageInfo?: (pageInfo: ServiceNoticePageInfo) => void;
}) {
  return onSnapshot(
    query(
      serviceNoticesCollection,
      where("status", "==", "PUBLISHED"),
      orderBy("publishedAt", "desc"),
      limit(limitCount + 1)
    ),
    (snapshot) => {
      const page = readServiceNoticePage(snapshot.docs, limitCount);
      onChange(page.notices);
      onPageInfo?.({ cursor: page.cursor, hasMore: page.hasMore });
    },
    (error) => onError?.(getFirebaseErrorMessage(error))
  );
}

export function subscribeAdminServiceNotices({
  limitCount = ADMIN_NOTICE_PAGE_SIZE,
  onChange,
  onError,
  onPageInfo,
}: {
  limitCount?: number;
  onChange: (notices: ServiceNotice[]) => void;
  onError?: (message: string) => void;
  onPageInfo?: (pageInfo: ServiceNoticePageInfo) => void;
}) {
  return onSnapshot(
    query(
      serviceNoticesCollection,
      orderBy("updatedAt", "desc"),
      limit(limitCount + 1)
    ),
    (snapshot) => {
      const page = readServiceNoticePage(snapshot.docs, limitCount);
      onChange(page.notices);
      onPageInfo?.({ cursor: page.cursor, hasMore: page.hasMore });
    },
    (error) => onError?.(getFirebaseErrorMessage(error))
  );
}

export async function loadOlderPublishedServiceNotices({
  cursor,
  pageSize = PUBLISHED_NOTICE_PAGE_SIZE,
}: {
  cursor: QueryDocumentSnapshot<DocumentData>;
  pageSize?: number;
}): Promise<ServiceNoticePage> {
  const snapshot = await getDocs(
    query(
      serviceNoticesCollection,
      where("status", "==", "PUBLISHED"),
      orderBy("publishedAt", "desc"),
      startAfter(cursor),
      limit(pageSize + 1)
    )
  );

  return readServiceNoticePage(snapshot.docs, pageSize);
}

export async function loadOlderAdminServiceNotices({
  cursor,
  pageSize = ADMIN_NOTICE_PAGE_SIZE,
}: {
  cursor: QueryDocumentSnapshot<DocumentData>;
  pageSize?: number;
}): Promise<ServiceNoticePage> {
  const snapshot = await getDocs(
    query(
      serviceNoticesCollection,
      orderBy("updatedAt", "desc"),
      startAfter(cursor),
      limit(pageSize + 1)
    )
  );

  return readServiceNoticePage(snapshot.docs, pageSize);
}

export async function loadServiceNoticeCounts() {
  const [allCount, publishedCount] = await Promise.all([
    getCountFromServer(serviceNoticesCollection),
    getCountFromServer(
      query(serviceNoticesCollection, where("status", "==", "PUBLISHED"))
    ),
  ]);
  const published = publishedCount.data().count;

  return {
    draft: Math.max(0, allCount.data().count - published),
    published,
  };
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

function readServiceNoticePage(
  documents: QueryDocumentSnapshot<DocumentData>[],
  pageSize: number
): ServiceNoticePage {
  const visibleDocuments = documents.slice(0, pageSize);

  return {
    cursor: visibleDocuments[visibleDocuments.length - 1] ?? null,
    hasMore: documents.length > pageSize,
    notices: visibleDocuments.map(readServiceNotice),
  };
}
