import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  arrayUnion,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../../lib/firebase/app";
import { getFirebaseErrorMessage } from "../../../lib/firebase/firebaseErrorMessage";
import type { ChatMessage, ChatRoom } from "../types/chatTypes";

type CreateSecretRoomInput = {
  createdBy: string;
  familyId: string;
  name: string;
};

type CreateDirectRoomInput = {
  createdBy: string;
  familyId: string;
  targetUserId: string;
  targetUserName: string;
};

type CreatePrivateGroupRoomInput = {
  createdBy: string;
  familyId: string;
  memberIds: string[];
  name: string;
};

type SendTextMessageInput = {
  createdBy: string;
  familyId: string;
  roomId: string;
  text: string;
};

type SendPollMessageInput = {
  createdBy: string;
  familyId: string;
  pollId: string;
  pollTitle: string;
  roomId: string;
};

export async function getOrCreateFamilyRoom({
  createdBy,
  familyId,
}: {
  createdBy: string;
  familyId: string;
}) {
  const roomId = `${familyId}_family`;
  const roomRef = doc(db, "chatRooms", roomId);
  const roomSnapshot = await getDoc(roomRef);

  if (roomSnapshot.exists()) {
    return roomId;
  }

  await setDoc(roomRef, {
    id: roomId,
    familyId,
    type: "FAMILY",
    name: "가족 전체방",
    memberIds: [],
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessageText: null,
    lastMessageAt: null,
  });

  return roomId;
}

export async function createSecretRoom({
  createdBy,
  familyId,
  name,
}: CreateSecretRoomInput) {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error("비밀방 이름을 입력해주세요.");
  }

  const roomRef = doc(collection(db, "chatRooms"));

  await setDoc(roomRef, {
    id: roomRef.id,
    familyId,
    type: "PRIVATE_GROUP",
    name: normalizedName,
    memberIds: [createdBy],
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessageText: null,
    lastMessageAt: null,
  });

  return roomRef.id;
}

export async function getOrCreateDirectRoom({
  createdBy,
  familyId,
  targetUserId,
  targetUserName,
}: CreateDirectRoomInput) {
  if (createdBy === targetUserId) {
    throw new Error("본인과의 1:1 채팅방은 만들 수 없습니다.");
  }

  const memberIds = [createdBy, targetUserId].sort();
  const roomId = `${familyId}_direct_${memberIds.join("_")}`;
  const roomRef = doc(db, "chatRooms", roomId);
  const roomSnapshot = await getDoc(roomRef);

  if (roomSnapshot.exists()) {
    return roomId;
  }

  await setDoc(roomRef, {
    id: roomId,
    familyId,
    type: "DIRECT",
    name: `${targetUserName}님과의 대화`,
    memberIds,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessageText: null,
    lastMessageAt: null,
  });

  return roomId;
}

export async function createPrivateGroupRoom({
  createdBy,
  familyId,
  memberIds,
  name,
}: CreatePrivateGroupRoomInput) {
  const normalizedName = name.trim();
  const normalizedMemberIds = Array.from(new Set([createdBy, ...memberIds]));

  if (!normalizedName) {
    throw new Error("그룹방 이름을 입력해주세요.");
  }

  if (normalizedMemberIds.length < 2) {
    throw new Error("그룹방에는 본인 외 구성원 1명 이상이 필요합니다.");
  }

  const roomRef = doc(collection(db, "chatRooms"));

  await setDoc(roomRef, {
    id: roomRef.id,
    familyId,
    type: "PRIVATE_GROUP",
    name: normalizedName,
    memberIds: normalizedMemberIds,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessageText: null,
    lastMessageAt: null,
  });

  return roomRef.id;
}

export function subscribeChatRooms({
  familyId,
  onChange,
  onError,
  userId,
}: {
  familyId: string;
  onChange: (rooms: ChatRoom[]) => void;
  onError?: (message: string) => void;
  userId: string;
}): Unsubscribe {
  const roomsQuery = query(
    collection(db, "chatRooms"),
    where("familyId", "==", familyId)
  );

  return onSnapshot(
    roomsQuery,
    (snapshot) => {
      const rooms = snapshot.docs
        .map((roomDoc) => roomDoc.data() as ChatRoom)
        .filter(
          (room) =>
            room.type === "FAMILY" ||
            room.createdBy === userId ||
            (room.memberIds ?? []).includes(userId)
        )
        .sort((a, b) => getTime(b.updatedAt) - getTime(a.updatedAt));

      onChange(rooms);
    },
    (error) => {
      onError?.(getFirebaseErrorMessage(error));
    }
  );
}

export function subscribeMessages({
  onChange,
  onError,
  roomId,
}: {
  onChange: (messages: ChatMessage[]) => void;
  onError?: (message: string) => void;
  roomId: string;
}): Unsubscribe {
  const messagesQuery = query(
    collection(db, "messages"),
    where("roomId", "==", roomId)
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs
        .map((messageDoc) => messageDoc.data() as ChatMessage)
        .sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt));

      onChange(messages);
    },
    (error) => {
      onError?.(getFirebaseErrorMessage(error));
    }
  );
}

export async function sendTextMessage({
  createdBy,
  familyId,
  roomId,
  text,
}: SendTextMessageInput) {
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new Error("메시지를 입력해주세요.");
  }

  const messageRef = doc(collection(db, "messages"));

  await setDoc(messageRef, {
    id: messageRef.id,
    familyId,
    roomId,
    type: "TEXT",
    text: normalizedText,
    pollId: null,
    createdBy,
    createdAt: serverTimestamp(),
    readBy: [createdBy],
  });

  await updateDoc(doc(db, "chatRooms", roomId), {
    lastMessageText: normalizedText,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function sendPollMessage({
  createdBy,
  familyId,
  pollId,
  pollTitle,
  roomId,
}: SendPollMessageInput) {
  const normalizedTitle = pollTitle.trim();

  if (!pollId) {
    throw new Error("전송할 투표를 찾을 수 없습니다.");
  }

  const messageRef = doc(collection(db, "messages"));
  const messageText = `투표: ${normalizedTitle}`;

  await setDoc(messageRef, {
    id: messageRef.id,
    familyId,
    roomId,
    type: "POLL",
    text: messageText,
    pollId,
    createdBy,
    createdAt: serverTimestamp(),
    readBy: [createdBy],
  });

  await updateDoc(doc(db, "chatRooms", roomId), {
    lastMessageText: messageText,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function markRoomMessagesAsRead({
  messages,
  userId,
}: {
  messages: ChatMessage[];
  userId: string;
}) {
  const unreadMessages = messages.filter(
    (message) => message.createdBy !== userId && !message.readBy.includes(userId)
  );

  if (unreadMessages.length === 0) {
    return;
  }

  const batch = writeBatch(db);

  unreadMessages.forEach((message) => {
    batch.update(doc(db, "messages", message.id), {
      readBy: arrayUnion(userId),
    });
  });

  await batch.commit();
}

function getTime(value: unknown) {
  if (value && typeof value === "object" && "seconds" in value) {
    return Number((value as { seconds: number }).seconds) * 1000;
  }

  return 0;
}
