import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  arrayUnion,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../../lib/firebase/app";
import { getFirebaseErrorMessage } from "../../../lib/firebase/firebaseErrorMessage";
import {
  chunkFirestoreWrites,
  FIRESTORE_SAFE_BATCH_SIZE,
} from "../../../lib/firebase/firestoreBatch";
import { getLatestMessagePreview, getTimestampMilliseconds } from "../utils/chatMessagePreview";
import { mergeChatRooms } from "../utils/chatRoomPagination";
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

export const CHAT_MESSAGE_PAGE_SIZE = 40;
export const CHAT_ROOM_PAGE_SIZE = 30;

export type ChatMessageCursor = QueryDocumentSnapshot<DocumentData>;
export type ChatRoomCursor = QueryDocumentSnapshot<DocumentData>;

export type ChatRoomPageInfo = {
  cursors: {
    created: ChatRoomCursor | null;
    family: ChatRoomCursor | null;
    member: ChatRoomCursor | null;
  };
  hasMore: {
    created: boolean;
    family: boolean;
    member: boolean;
  };
};

export type ChatRoomPage = ChatRoomPageInfo & {
  rooms: ChatRoom[];
};

export type ChatMessagePage = {
  cursor: ChatMessageCursor | null;
  hasMore: boolean;
  messages: ChatMessage[];
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
    lastMessageCreatedBy: null,
  });

  return roomId;
}

export async function getChatRoom({
  familyId,
  roomId,
}: {
  familyId: string;
  roomId: string;
}) {
  const roomSnapshot = await getDoc(
    doc(db, "families", familyId, "chatRooms", roomId)
  );

  return roomSnapshot.exists() ? (roomSnapshot.data() as ChatRoom) : null;
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
    lastMessageCreatedBy: null,
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
    lastMessageCreatedBy: null,
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
    lastMessageCreatedBy: null,
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
  const roomRef = doc(db, "families", familyId, "chatRooms", roomId);
  const roomSnapshot = await getDoc(roomRef);

  if (!roomSnapshot.exists()) {
    return;
  }

  const room = roomSnapshot.data() as ChatRoom;

  if (room.type === "FAMILY") {
    throw new Error("크루 전체방은 삭제할 수 없어요.");
  }

  if (!room.deleting) {
    await updateDoc(roomRef, {
      deleting: true,
      updatedAt: serverTimestamp(),
    });
  }

  const messagesQuery = query(
    collection(db, "families", familyId, "messages"),
    where("roomId", "==", roomId),
    limit(FIRESTORE_SAFE_BATCH_SIZE)
  );

  while (true) {
    const messagesSnapshot = await getDocs(messagesQuery);

    if (messagesSnapshot.empty) {
      break;
    }

    const batch = writeBatch(db);
    messagesSnapshot.docs.forEach((messageDocument) => batch.delete(messageDocument.ref));
    await batch.commit();
  }

  await deleteDoc(roomRef);
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
  limitCount = CHAT_ROOM_PAGE_SIZE,
  onChange,
  onError,
  onPageInfo,
  userId,
}: {
  familyId: string;
  limitCount?: number;
  onChange: (rooms: ChatRoom[]) => void;
  onError?: (message: string) => void;
  onPageInfo?: (pageInfo: ChatRoomPageInfo) => void;
  userId: string;
}): Unsubscribe {
  const roomsCollection = collection(db, "families", familyId, "chatRooms");
  const familyRoomsQuery = query(
    roomsCollection,
    where("type", "==", "FAMILY"),
    orderBy("updatedAt", "desc"),
    limit(limitCount + 1)
  );
  const createdRoomsQuery = query(
    roomsCollection,
    where("createdBy", "==", userId),
    orderBy("updatedAt", "desc"),
    limit(limitCount + 1)
  );
  const memberRoomsQuery = query(
    roomsCollection,
    where("memberIds", "array-contains", userId),
    orderBy("updatedAt", "desc"),
    limit(limitCount + 1)
  );
  const roomBuckets = new Map<ChatRoomBucketKey, ChatRoomBucket>();

  function emitMergedRooms() {
    if (roomBuckets.size < 3) {
      return;
    }

    const createdBucket = roomBuckets.get("created") as ChatRoomBucket;
    const familyBucket = roomBuckets.get("family") as ChatRoomBucket;
    const memberBucket = roomBuckets.get("member") as ChatRoomBucket;
    const rooms = mergeChatRooms(
      familyBucket.rooms,
      createdBucket.rooms,
      memberBucket.rooms
    );

    onChange(rooms);
    onPageInfo?.({
      cursors: {
        created: createdBucket.cursor,
        family: familyBucket.cursor,
        member: memberBucket.cursor,
      },
      hasMore: {
        created: createdBucket.hasMore,
        family: familyBucket.hasMore,
        member: memberBucket.hasMore,
      },
    });
  }

  const unsubscribeFamilyRooms = onSnapshot(
    familyRoomsQuery,
    (snapshot) => {
      roomBuckets.set(
        "family",
        readChatRoomBucket(snapshot.docs, limitCount)
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
        readChatRoomBucket(snapshot.docs, limitCount)
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
        readChatRoomBucket(snapshot.docs, limitCount)
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

export async function loadOlderChatRooms({
  familyId,
  pageInfo,
  pageSize = CHAT_ROOM_PAGE_SIZE,
  userId,
}: {
  familyId: string;
  pageInfo: ChatRoomPageInfo;
  pageSize?: number;
  userId: string;
}): Promise<ChatRoomPage> {
  const roomsCollection = collection(db, "families", familyId, "chatRooms");
  const [familySnapshot, createdSnapshot, memberSnapshot] = await Promise.all([
    pageInfo.hasMore.family && pageInfo.cursors.family
      ? getDocs(
          query(
            roomsCollection,
            where("type", "==", "FAMILY"),
            orderBy("updatedAt", "desc"),
            startAfter(pageInfo.cursors.family),
            limit(pageSize + 1)
          )
        )
      : null,
    pageInfo.hasMore.created && pageInfo.cursors.created
      ? getDocs(
          query(
            roomsCollection,
            where("createdBy", "==", userId),
            orderBy("updatedAt", "desc"),
            startAfter(pageInfo.cursors.created),
            limit(pageSize + 1)
          )
        )
      : null,
    pageInfo.hasMore.member && pageInfo.cursors.member
      ? getDocs(
          query(
            roomsCollection,
            where("memberIds", "array-contains", userId),
            orderBy("updatedAt", "desc"),
            startAfter(pageInfo.cursors.member),
            limit(pageSize + 1)
          )
        )
      : null,
  ]);
  const familyBucket = familySnapshot
    ? readChatRoomBucket(familySnapshot.docs, pageSize)
    : emptyChatRoomBucket();
  const createdBucket = createdSnapshot
    ? readChatRoomBucket(createdSnapshot.docs, pageSize)
    : emptyChatRoomBucket();
  const memberBucket = memberSnapshot
    ? readChatRoomBucket(memberSnapshot.docs, pageSize)
    : emptyChatRoomBucket();

  return {
    cursors: {
      created: createdBucket.cursor,
      family: familyBucket.cursor,
      member: memberBucket.cursor,
    },
    hasMore: {
      created: createdBucket.hasMore,
      family: familyBucket.hasMore,
      member: memberBucket.hasMore,
    },
    rooms: mergeChatRooms(
      familyBucket.rooms,
      createdBucket.rooms,
      memberBucket.rooms
    ),
  };
}

type ChatRoomBucketKey = "created" | "family" | "member";

type ChatRoomBucket = {
  cursor: ChatRoomCursor | null;
  hasMore: boolean;
  rooms: ChatRoom[];
};

function readChatRoomBucket(
  documents: QueryDocumentSnapshot<DocumentData>[],
  pageSize: number
): ChatRoomBucket {
  const visibleDocuments = documents.slice(0, pageSize);

  return {
    cursor: visibleDocuments[visibleDocuments.length - 1] ?? null,
    hasMore: documents.length > pageSize,
    rooms: visibleDocuments.map((roomDocument) => roomDocument.data() as ChatRoom),
  };
}

function emptyChatRoomBucket(): ChatRoomBucket {
  return {
    cursor: null,
    hasMore: false,
    rooms: [],
  };
}

export function subscribeRecentMessages({
  familyId,
  onChange,
  onError,
  roomId,
}: {
  familyId: string;
  onChange: (page: ChatMessagePage) => void;
  onError?: (message: string) => void;
  roomId: string;
}): Unsubscribe {
  const messagesQuery = query(
    collection(db, "families", familyId, "messages"),
    where("roomId", "==", roomId),
    orderBy("createdAt", "desc"),
    limit(CHAT_MESSAGE_PAGE_SIZE + 1)
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => onChange(readChatMessagePage(snapshot.docs)),
    (error) => {
      onError?.(getFirebaseErrorMessage(error));
    }
  );
}

export async function loadOlderMessages({
  cursor,
  familyId,
  roomId,
}: {
  cursor: ChatMessageCursor;
  familyId: string;
  roomId: string;
}): Promise<ChatMessagePage> {
  const snapshot = await getDocs(
    query(
      collection(db, "families", familyId, "messages"),
      where("roomId", "==", roomId),
      orderBy("createdAt", "desc"),
      startAfter(cursor),
      limit(CHAT_MESSAGE_PAGE_SIZE + 1)
    )
  );

  return readChatMessagePage(snapshot.docs);
}

function readChatMessagePage(
  documents: QueryDocumentSnapshot<DocumentData>[]
): ChatMessagePage {
  const visibleDocuments = documents.slice(0, CHAT_MESSAGE_PAGE_SIZE);

  return {
    cursor: visibleDocuments[visibleDocuments.length - 1] ?? null,
    hasMore: documents.length > CHAT_MESSAGE_PAGE_SIZE,
    messages: visibleDocuments
      .map(
        (messageDocument) =>
          messageDocument.data({ serverTimestamps: "estimate" }) as ChatMessage
      )
      .reverse(),
  };
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
    lastMessageCreatedBy: createdBy,
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
    lastMessageCreatedBy: createdBy,
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
      where("roomId", "==", initialMessage.roomId),
      orderBy("createdAt", "desc"),
      limit(2)
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
          lastMessageCreatedBy: preview.createdBy,
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

  for (const messageChunk of chunkFirestoreWrites(unreadMessages)) {
    const batch = writeBatch(db);

    messageChunk.forEach((message) => {
      batch.update(doc(db, "families", familyId, "messages", message.id), {
        readBy: arrayUnion(userId),
      });
    });

    await batch.commit();
  }
}
