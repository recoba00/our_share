import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../../lib/firebase/app";
import { getFirebaseErrorMessage } from "../../../lib/firebase/firebaseErrorMessage";
import type { Memo, MemoType } from "../types/memoTypes";

type CreateMemoInput = {
  content: string;
  createdBy: string;
  familyId: string;
  password: string;
  title: string;
  type: MemoType;
};

export async function createMemo(input: CreateMemoInput) {
  const normalizedTitle = input.title.trim();
  const normalizedContent = input.content.trim();

  if (!normalizedTitle) {
    throw new Error("메모 제목을 입력해주세요.");
  }

  if (!normalizedContent) {
    throw new Error("메모 내용을 입력해주세요.");
  }

  const memoRef = doc(collection(db, "memos"));
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...encryptedFields,
  });

  return memoRef.id;
}

export function subscribeMemos({
  familyId,
  onChange,
  onError,
  userId,
}: {
  familyId: string;
  onChange: (memos: Memo[]) => void;
  onError?: (message: string) => void;
  userId: string;
}): Unsubscribe {
  const memosQuery = query(collection(db, "memos"), where("familyId", "==", familyId));

  return onSnapshot(
    memosQuery,
    (snapshot) => {
      const memos = snapshot.docs
        .map((memoDoc) => memoDoc.data() as Memo)
        .filter(
          (memo) =>
            memo.type === "PUBLIC" ||
            memo.createdBy === userId ||
            memo.visibleTo.includes(userId)
        )
        .sort((a, b) => getTime(b.updatedAt) - getTime(a.updatedAt));

      onChange(memos);
    },
    (error) => {
      onError?.(getFirebaseErrorMessage(error));
    }
  );
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
    throw new Error("열람할 민감 메모 데이터가 없습니다.");
  }

  try {
    return await decryptSensitiveContent({
      encryptedContent: memo.encryptedContent,
      iv: memo.encryptionIv,
      password,
      salt: memo.encryptionSalt,
    });
  } catch {
    throw new Error("비밀번호가 맞지 않거나 메모를 열 수 없습니다.");
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
    throw new Error("민감 메모 비밀번호를 입력해주세요.");
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

function getTime(value: unknown) {
  if (value && typeof value === "object" && "seconds" in value) {
    return Number((value as { seconds: number }).seconds) * 1000;
  }

  return 0;
}
