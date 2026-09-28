import type { ChatMessage } from "../types/chatTypes";

export function getLatestMessagePreview(messages: ChatMessage[]) {
  const latestMessage = [...messages].sort(
    (a, b) =>
      getTimestampMilliseconds(b.createdAt) - getTimestampMilliseconds(a.createdAt)
  )[0];

  return {
    text: latestMessage?.text ?? null,
    createdAt: latestMessage?.createdAt ?? null,
    createdBy: latestMessage?.createdBy ?? null,
  };
}

export function getTimestampMilliseconds(value: unknown) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  if (value && typeof value === "object") {
    if ("toMillis" in value && typeof value.toMillis === "function") {
      return value.toMillis();
    }

    if ("seconds" in value && typeof value.seconds === "number") {
      const timestamp = value as { seconds: number; nanoseconds?: number };

      return timestamp.seconds * 1000 + (timestamp.nanoseconds ?? 0) / 1_000_000;
    }
  }

  return 0;
}
