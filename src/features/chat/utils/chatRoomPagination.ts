import type { ChatRoom } from "../types/chatTypes";
import { getTimestampMilliseconds } from "./chatMessagePreview";

export function mergeChatRooms(...roomGroups: ChatRoom[][]) {
  return roomGroups
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
}

export function getChatRoomsLeavingRecentWindow(
  previousRooms: ChatRoom[],
  nextRooms: ChatRoom[]
) {
  const nextRoomIds = new Set(nextRooms.map((room) => room.id));

  return previousRooms.filter((room) => !nextRoomIds.has(room.id));
}
