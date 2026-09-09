import {
  collection,
  doc,
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
import type { ChatMessage, ChatRoom } from "../types/chatTypes";

type CreateSecretRoomInput = {
  createdBy: string;
  familyId: string;
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

  await setDoc(
    roomRef,
    {
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
    },
    { merge: true }
  );

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

export function subscribeChatRooms({
  familyId,
  onChange,
  userId,
}: {
  familyId: string;
  onChange: (rooms: ChatRoom[]) => void;
  userId: string;
}): Unsubscribe {
  const roomsQuery = query(
    collection(db, "chatRooms"),
    where("familyId", "==", familyId)
  );

  return onSnapshot(roomsQuery, (snapshot) => {
    const rooms = snapshot.docs
      .map((roomDoc) => roomDoc.data() as ChatRoom)
      .filter(
        (room) =>
          room.type === "FAMILY" ||
          room.createdBy === userId ||
          room.memberIds.includes(userId)
      )
      .sort((a, b) => getTime(b.updatedAt) - getTime(a.updatedAt));

    onChange(rooms);
  });
}

export function subscribeMessages({
  onChange,
  roomId,
}: {
  onChange: (messages: ChatMessage[]) => void;
  roomId: string;
}): Unsubscribe {
  const messagesQuery = query(
    collection(db, "messages"),
    where("roomId", "==", roomId)
  );

  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs
      .map((messageDoc) => messageDoc.data() as ChatMessage)
      .sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt));

    onChange(messages);
  });
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
