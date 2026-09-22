import type { ChatMessage } from "../types/chatTypes";

export function getLatestMessagePreview(messages: ChatMessage[]) {
  const latestMessage = [...messages].sort(
    (a, b) =>
      getTimestampMilliseconds(b.createdAt) - getTimestampMilliseconds(a.createdAt)
  )[0];

  return {
    text: latestMessage?.text ?? null,
    createdAt: latestMessage?.createdAt ?? null,
  };
}

export function getTimestampMilliseconds(value: unknown) {
  if (!value || typeof value !== "object" || !("seconds" in value)) {
    return 0;
  }

  const timestamp = value as { seconds: number; nanoseconds?: number };

  return timestamp.seconds * 1000 + (timestamp.nanoseconds ?? 0) / 1_000_000;
}
