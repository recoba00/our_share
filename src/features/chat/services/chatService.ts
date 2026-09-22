import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
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
import { getLatestMessagePreview, getTimestampMilliseconds } from "../utils/chatMessagePreview";
import type { ChatMessage, ChatRoom } from "../types/chatTypes";

type CreateSecretRoomInput = {
  createdBy: string;
  familyId: string;
  memberIds: string[];
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

type UpdateTextMessageInput = {
  familyId: string;
  messageId: string;
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
  const roomRef = doc(db, "families", familyId, "chatRooms", roomId);
  const roomSnapshot = await getDoc(roomRef);

  if (roomSnapshot.exists()) {
    return roomId;
  }

  await setDoc(roomRef, {
    id: roomId,
    familyId,
    type: "FAMILY",
    name: "크루 전체방",
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
  memberIds,
  name,
}: CreateSecretRoomInput) {
  const normalizedName = name.trim();
  const normalizedMemberIds = Array.from(new Set([createdBy, ...memberIds]));

  if (!normalizedName) {
    throw new Error("비밀방 이름을 적어주세요.");
  }

  if (normalizedMemberIds.length < 2) {
    throw new Error("비밀방에는 나 외에 멤버 1명 이상이 필요해요.");
  }

  const roomRef = doc(collection(db, "families", familyId, "chatRooms"));

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

export async function getOrCreateDirectRoom({
  createdBy,
  familyId,
  targetUserId,
  targetUserName,
}: CreateDirectRoomInput) {
  if (createdBy === targetUserId) {
    throw new Error("나와의 1:1 채팅방은 만들 수 없어요.");
  }

  const memberIds = [createdBy, targetUserId].sort();
  const roomId = `${familyId}_direct_${memberIds.join("_")}`;
  const roomRef = doc(db, "families", familyId, "chatRooms", roomId);
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
    throw new Error("크루 채팅방 이름을 적어주세요.");
  }

  if (normalizedMemberIds.length < 2) {
    throw new Error("크루 채팅방에는 나 외에 멤버 1명 이상이 필요해요.");
  }

  const roomRef = doc(collection(db, "families", familyId, "chatRooms"));

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

export async function deleteChatRoom({
  familyId,
  roomId,
}: {
  familyId: string;
  roomId: string;
}) {
  await deleteDoc(doc(db, "families", familyId, "chatRooms", roomId));
}

export async function removeChatRoomMember({
  familyId,
  roomId,
  targetUserId,
}: {
  familyId: string;
  roomId: string;
  targetUserId: string;
}) {
  const roomRef = doc(db, "families", familyId, "chatRooms", roomId);
  const roomSnapshot = await getDoc(roomRef);

  if (!roomSnapshot.exists()) {
    throw new Error("채팅방을 찾을 수 없어요.");
  }

  const room = roomSnapshot.data() as ChatRoom;
  if (room.type !== "PRIVATE_GROUP") {
    throw new Error("이 채팅방에서는 멤버를 내보낼 수 없어요.");
  }

  if (!room.memberIds.includes(targetUserId)) {
    throw new Error("이미 채팅방에 없는 멤버예요.");
  }

  await updateDoc(roomRef, {
    memberIds: room.memberIds.filter((memberId) => memberId !== targetUserId),
    updatedAt: serverTimestamp(),
  });
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
  const familyRoomsQuery = query(
    collection(db, "families", familyId, "chatRooms"),
    where("type", "==", "FAMILY")
  );
  const createdRoomsQuery = query(
    collection(db, "families", familyId, "chatRooms"),
    where("createdBy", "==", userId)
  );
  const memberRoomsQuery = query(
    collection(db, "families", familyId, "chatRooms"),
    where("memberIds", "array-contains", userId)
  );
  const roomBuckets = new Map<string, ChatRoom[]>();

  function emitMergedRooms() {
    const rooms = [...roomBuckets.values()]
      .flat()
      .filter(
        (room, index, allRooms) =>
          allRooms.findIndex((nextRoom) => nextRoom.id === room.id) === index
      )
      .sort(
        (a, b) =>
          getTimestampMilliseconds(b.updatedAt) -
          getTimestampMilliseconds(a.updatedAt)
      );

    onChange(rooms);
  }

  const unsubscribeFamilyRooms = onSnapshot(
    familyRoomsQuery,
    (snapshot) => {
      roomBuckets.set(
        "family",
        snapshot.docs.map((roomDoc) => roomDoc.data() as ChatRoom)
      );
      emitMergedRooms();
    },
    (error) => {
      onError?.(getFirebaseErrorMessage(error));
    }
  );
  const unsubscribeCreatedRooms = onSnapshot(
    createdRoomsQuery,
    (snapshot) => {
      roomBuckets.set(
        "created",
        snapshot.docs.map((roomDoc) => roomDoc.data() as ChatRoom)
      );
      emitMergedRooms();
    },
    (error) => {
      onError?.(getFirebaseErrorMessage(error));
    }
  );
  const unsubscribeMemberRooms = onSnapshot(
    memberRoomsQuery,
    (snapshot) => {
      roomBuckets.set(
        "member",
        snapshot.docs.map((roomDoc) => roomDoc.data() as ChatRoom)
      );
      emitMergedRooms();
    },
    (error) => {
      onError?.(getFirebaseErrorMessage(error));
    }
  );

  return () => {
    unsubscribeFamilyRooms();
    unsubscribeCreatedRooms();
    unsubscribeMemberRooms();
  };
}

export function subscribeMessages({
  familyId,
  onChange,
  onError,
  roomId,
}: {
  familyId: string;
  onChange: (messages: ChatMessage[]) => void;
  onError?: (message: string) => void;
  roomId: string;
}): Unsubscribe {
  const messagesQuery = query(
    collection(db, "families", familyId, "messages"),
    where("roomId", "==", roomId)
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs
        .map((messageDoc) => messageDoc.data() as ChatMessage)
        .sort(
          (a, b) =>
            getTimestampMilliseconds(a.createdAt) -
            getTimestampMilliseconds(b.createdAt)
        );

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
    throw new Error("메시지를 적어주세요.");
  }

  const messageRef = doc(collection(db, "families", familyId, "messages"));

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

  await updateDoc(doc(db, "families", familyId, "chatRooms", roomId), {
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
    throw new Error("보낼 투표를 찾을 수 없어요.");
  }

  const messageRef = doc(collection(db, "families", familyId, "messages"));
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

  await updateDoc(doc(db, "families", familyId, "chatRooms", roomId), {
    lastMessageText: messageText,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTextMessage({
  familyId,
  messageId,
  text,
}: UpdateTextMessageInput) {
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new Error("수정할 메시지를 적어주세요.");
  }

  await updateDoc(doc(db, "families", familyId, "messages", messageId), {
    text: normalizedText,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMessage({
  familyId,
  messageId,
}: {
  familyId: string;
  messageId: string;
}) {
  const messageRef = doc(db, "families", familyId, "messages", messageId);
  const initialMessageSnapshot = await getDoc(messageRef);

  if (!initialMessageSnapshot.exists()) {
    return;
  }

  const initialMessage = initialMessageSnapshot.data() as ChatMessage;
  const messagesSnapshot = await getDocs(
    query(
      collection(db, "families", familyId, "messages"),
      where("roomId", "==", initialMessage.roomId)
    )
  );
  const preview = getLatestMessagePreview(
    messagesSnapshot.docs
      .filter((messageDoc) => messageDoc.id !== messageId)
      .map((messageDoc) => messageDoc.data() as ChatMessage)
  );

  await runTransaction(db, async (transaction) => {
    const messageSnapshot = await transaction.get(messageRef);

    if (!messageSnapshot.exists()) {
      return;
    }

    const message = messageSnapshot.data() as ChatMessage;
    const roomRef = doc(db, "families", familyId, "chatRooms", message.roomId);
    const roomSnapshot = await transaction.get(roomRef);

    transaction.delete(messageRef);

    if (roomSnapshot.exists()) {
      const room = roomSnapshot.data() as ChatRoom;
      const stillCurrentPreview =
        room.lastMessageText === message.text &&
        getTimestampMilliseconds(room.lastMessageAt) ===
          getTimestampMilliseconds(message.createdAt);

      if (stillCurrentPreview) {
        transaction.update(roomRef, {
          lastMessageText: preview.text,
          lastMessageAt: preview.createdAt,
          updatedAt: serverTimestamp(),
        });
      }
    }
  });
}

export async function markRoomMessagesAsRead({
  familyId,
  messages,
  userId,
}: {
  familyId: string;
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
    batch.update(doc(db, "families", familyId, "messages", message.id), {
      readBy: arrayUnion(userId),
    });
  });

  await batch.commit();
}
