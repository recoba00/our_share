import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../../lib/firebase/app";
import { getFirebaseErrorMessage } from "../../../lib/firebase/firebaseErrorMessage";
import type { Memo, MemoType } from "../types/memoTypes";
import { mergeMemos } from "../utils/memoPagination";

type CreateMemoInput = {
  content: string;
  createdBy: string;
  familyId: string;
  password: string;
  title: string;
  type: MemoType;
};

export const MEMO_PAGE_SIZE = 30;

export type MemoCursor = QueryDocumentSnapshot<DocumentData>;

export type MemoPageInfo = {
  cursors: {
    private: MemoCursor | null;
    public: MemoCursor | null;
  };
  hasMore: {
    private: boolean;
    public: boolean;
  };
};

export type MemoPage = MemoPageInfo & {
  memos: Memo[];
};

export async function createMemo(input: CreateMemoInput) {
  const normalizedTitle = input.title.trim();
  const normalizedContent = input.content.trim();

  if (!normalizedTitle) {
    throw new Error("메모 제목을 적어주세요.");
  }

  if (!normalizedContent) {
    throw new Error("메모 내용을 적어주세요.");
  }

  const memoRef = doc(collection(db, "families", input.familyId, "memos"));
  const encryptedFields =
    input.type === "SENSITIVE"
      ? await encryptSensitiveContent({
          content: normalizedContent,
          password: input.password,
        })
      : {
          encryptedContent: null,
          encryptionIv: null,
          encryptionSalt: null,
        };

  await setDoc(memoRef, {
    id: memoRef.id,
    familyId: input.familyId,
    title: normalizedTitle,
    content: input.type === "PUBLIC" ? normalizedContent : null,
    type: input.type,
    createdBy: input.createdBy,
    visibleTo: input.type === "PUBLIC" ? [] : [input.createdBy],
    visibility: input.type === "PUBLIC" ? "FAMILY" : "PRIVATE",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...encryptedFields,
  });

  return memoRef.id;
}

export async function deleteMemo({
  familyId,
  memoId,
}: {
  familyId: string;
  memoId: string;
}) {
  await deleteDoc(doc(db, "families", familyId, "memos", memoId));
}

export function subscribeMemos({
  familyId,
  limitCount = MEMO_PAGE_SIZE,
  onChange,
  onError,
  onPageInfo,
  userId,
}: {
  familyId: string;
  limitCount?: number;
  onChange: (memos: Memo[]) => void;
  onError?: (message: string) => void;
  onPageInfo?: (pageInfo: MemoPageInfo) => void;
  userId: string;
}): Unsubscribe {
  const publicMemosQuery = query(
    collection(db, "families", familyId, "memos"),
    where("visibility", "==", "FAMILY"),
    orderBy("updatedAt", "desc"),
    limit(limitCount + 1)
  );
  const privateMemosQuery = query(
    collection(db, "families", familyId, "memos"),
    where("visibility", "==", "PRIVATE"),
    where("visibleTo", "array-contains", userId),
    orderBy("updatedAt", "desc"),
    limit(limitCount + 1)
  );
  const memoBuckets = new Map<"private" | "public", MemoBucket>();

  function emitMergedMemos() {
    if (memoBuckets.size < 2) {
      return;
    }

    const publicBucket = memoBuckets.get("public") as MemoBucket;
    const privateBucket = memoBuckets.get("private") as MemoBucket;
    const memos = mergeMemos(publicBucket.memos, privateBucket.memos);

    onChange(memos);
    onPageInfo?.({
      cursors: {
        private: privateBucket.cursor,
        public: publicBucket.cursor,
      },
      hasMore: {
        private: privateBucket.hasMore,
        public: publicBucket.hasMore,
      },
    });
  }

  const unsubscribePublicMemos = onSnapshot(
    publicMemosQuery,
    (snapshot) => {
      memoBuckets.set(
        "public",
        readMemoBucket(snapshot.docs, limitCount)
      );
      emitMergedMemos();
    },
    (error) => {
      onError?.(getFirebaseErrorMessage(error));
    }
  );
  const unsubscribePrivateMemos = onSnapshot(
    privateMemosQuery,
    (snapshot) => {
      memoBuckets.set(
        "private",
        readMemoBucket(snapshot.docs, limitCount)
      );
      emitMergedMemos();
    },
    (error) => {
      onError?.(getFirebaseErrorMessage(error));
    }
  );

  return () => {
    unsubscribePublicMemos();
    unsubscribePrivateMemos();
  };
}

export async function loadOlderMemos({
  familyId,
  pageInfo,
  pageSize = MEMO_PAGE_SIZE,
  userId,
}: {
  familyId: string;
  pageInfo: MemoPageInfo;
  pageSize?: number;
  userId: string;
}): Promise<MemoPage> {
  const memosCollection = collection(db, "families", familyId, "memos");
  const [publicSnapshot, privateSnapshot] = await Promise.all([
    pageInfo.hasMore.public && pageInfo.cursors.public
      ? getDocs(
          query(
            memosCollection,
            where("visibility", "==", "FAMILY"),
            orderBy("updatedAt", "desc"),
            startAfter(pageInfo.cursors.public),
            limit(pageSize + 1)
          )
        )
      : null,
    pageInfo.hasMore.private && pageInfo.cursors.private
      ? getDocs(
          query(
            memosCollection,
            where("visibility", "==", "PRIVATE"),
            where("visibleTo", "array-contains", userId),
            orderBy("updatedAt", "desc"),
            startAfter(pageInfo.cursors.private),
            limit(pageSize + 1)
          )
        )
      : null,
  ]);
  const publicBucket = publicSnapshot
    ? readMemoBucket(publicSnapshot.docs, pageSize)
    : emptyMemoBucket();
  const privateBucket = privateSnapshot
    ? readMemoBucket(privateSnapshot.docs, pageSize)
    : emptyMemoBucket();

  return {
    cursors: {
      private: privateBucket.cursor,
      public: publicBucket.cursor,
    },
    hasMore: {
      private: privateBucket.hasMore,
      public: publicBucket.hasMore,
    },
    memos: mergeMemos(publicBucket.memos, privateBucket.memos),
  };
}

type MemoBucket = {
  cursor: MemoCursor | null;
  hasMore: boolean;
  memos: Memo[];
};

function readMemoBucket(
  documents: QueryDocumentSnapshot<DocumentData>[],
  pageSize: number
): MemoBucket {
  const visibleDocuments = documents.slice(0, pageSize);

  return {
    cursor: visibleDocuments[visibleDocuments.length - 1] ?? null,
    hasMore: documents.length > pageSize,
    memos: visibleDocuments.map((memoDoc) => memoDoc.data() as Memo),
  };
}

function emptyMemoBucket(): MemoBucket {
  return {
    cursor: null,
    hasMore: false,
    memos: [],
  };
}

export async function revealSensitiveMemo({
  memo,
  password,
}: {
  memo: Memo;
  password: string;
}) {
  if (memo.type !== "SENSITIVE") {
    return memo.content ?? "";
  }

  if (!memo.encryptedContent || !memo.encryptionIv || !memo.encryptionSalt) {
    throw new Error("열어볼 민감 메모가 없어요.");
  }

  try {
    return await decryptSensitiveContent({
      encryptedContent: memo.encryptedContent,
      iv: memo.encryptionIv,
      password,
      salt: memo.encryptionSalt,
    });
  } catch {
    throw new Error("비밀번호가 맞지 않거나 메모를 열 수 없어요.");
  }
}

async function encryptSensitiveContent({
  content,
  password,
}: {
  content: string;
  password: string;
}) {
  if (!password.trim()) {
    throw new Error("민감 메모 비밀번호를 적어주세요.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derivePasswordKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(content)
  );

  return {
    encryptedContent: toBase64(new Uint8Array(encrypted)),
    encryptionIv: toBase64(iv),
    encryptionSalt: toBase64(salt),
  };
}

async function decryptSensitiveContent({
  encryptedContent,
  iv,
  password,
  salt,
}: {
  encryptedContent: string;
  iv: string;
  password: string;
  salt: string;
}) {
  const saltBytes = fromBase64(salt);
  const ivBytes = fromBase64(iv);
  const key = await derivePasswordKey(password, saltBytes);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    toArrayBuffer(fromBase64(encryptedContent))
  );

  return new TextDecoder().decode(decrypted);
}

async function derivePasswordKey(password: string, salt: Uint8Array) {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(new TextEncoder().encode(password)),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: 120000,
      salt: toArrayBuffer(salt),
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function toBase64(value: Uint8Array) {
  return btoa(String.fromCharCode(...value));
}

function toArrayBuffer(value: Uint8Array) {
  return value.buffer.slice(
    value.byteOffset,
    value.byteOffset + value.byteLength
  ) as ArrayBuffer;
}
