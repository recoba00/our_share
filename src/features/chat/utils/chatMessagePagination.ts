import type { ChatMessage } from "../types/chatTypes";
import { getTimestampMilliseconds } from "./chatMessagePreview";

export function mergeChatMessages(...messageGroups: ChatMessage[][]) {
  const messagesById = new Map<string, ChatMessage>();

  messageGroups.flat().forEach((message) => {
    messagesById.set(message.id, message);
  });

  return [...messagesById.values()].sort((left, right) => {
    const timeDifference =
      getTimestampMilliseconds(left.createdAt) -
      getTimestampMilliseconds(right.createdAt);

    return timeDifference || left.id.localeCompare(right.id);
  });
}

export function getMessagesLeavingRecentWindow(
  previousMessages: ChatMessage[],
  nextMessages: ChatMessage[]
) {
  const nextMessageIds = new Set(nextMessages.map((message) => message.id));

  return previousMessages.filter((message) => !nextMessageIds.has(message.id));
}
