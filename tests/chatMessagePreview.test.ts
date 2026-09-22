import { describe, expect, it } from "vitest";
import { getLatestMessagePreview } from "../src/features/chat/utils/chatMessagePreview";
import type { ChatMessage } from "../src/features/chat/types/chatTypes";

function message(id: string, seconds: number, text: string): ChatMessage {
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

describe("getLatestMessagePreview", () => {
  it("returns the newest remaining message after deletion", () => {
    const preview = getLatestMessagePreview([
      message("older", 10, "이전 메시지"),
      message("latest", 20, "최신 메시지"),
    ]);

    expect(preview).toEqual({
      text: "최신 메시지",
      createdAt: { seconds: 20, nanoseconds: 0 },
    });
  });

  it("clears the preview when the last message is deleted", () => {
    expect(getLatestMessagePreview([])).toEqual({ text: null, createdAt: null });
  });

  it("does not mutate the queried message list", () => {
    const messages = [
      message("newer", 20, "최신 메시지"),
      message("older", 10, "이전 메시지"),
    ];

    getLatestMessagePreview(messages);

    expect(messages.map(({ id }) => id)).toEqual(["newer", "older"]);
  });
});
