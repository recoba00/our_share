export type ChatRoomType = "FAMILY" | "DIRECT" | "PRIVATE_GROUP";

export type ChatMessageType = "TEXT" | "POLL";

export type ChatRoom = {
  id: string;
  familyId: string;
  type: ChatRoomType;
  name: string;
  memberIds: string[];
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
  lastMessageText: string | null;
  lastMessageAt: unknown;
};

export type ChatMessage = {
  id: string;
  familyId: string;
  roomId: string;
  type: ChatMessageType;
  text: string;
  pollId: string | null;
  createdBy: string;
  createdAt: unknown;
  readBy: string[];
};
