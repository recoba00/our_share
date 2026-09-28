import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../src/features/chat/types/chatTypes";
import {
  getMessagesLeavingRecentWindow,
  mergeChatMessages,
} from "../src/features/chat/utils/chatMessagePagination";

function message(id: string, seconds: number, text = id): ChatMessage {
  return {
    id,
    familyId: "crew-1",
    roomId: "room-1",
    type: "TEXT",
    text,
    pollId: null,
    createdBy: "member-1",
    createdAt: { seconds, nanoseconds: 0 },
    readBy: [],
  };
}

describe("chat message pagination", () => {
  it("merges pages chronologically without duplicate messages", () => {
    const merged = mergeChatMessages(
      [message("older", 10), message("overlap", 20, "old value")],
      [message("overlap", 20, "updated value"), message("recent", 30)]
    );

    expect(merged.map(({ id }) => id)).toEqual(["older", "overlap", "recent"]);
    expect(merged[1]?.text).toBe("updated value");
  });

  it("keeps messages that leave the bounded realtime window", () => {
    const previous = [message("one", 10), message("two", 20), message("three", 30)];
    const next = [message("two", 20), message("three", 30), message("four", 40)];

    expect(getMessagesLeavingRecentWindow(previous, next).map(({ id }) => id)).toEqual([
      "one",
    ]);
  });

  it("does not mutate the loaded message pages", () => {
    const older = [message("two", 20), message("one", 10)];
    const recent = [message("three", 30)];

    mergeChatMessages(older, recent);

    expect(older.map(({ id }) => id)).toEqual(["two", "one"]);
    expect(recent.map(({ id }) => id)).toEqual(["three"]);
  });
});
