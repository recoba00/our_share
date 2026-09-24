import { describe, expect, it } from "vitest";
import {
  buildChatMessageReportTarget,
  buildUserReportTarget,
} from "../src/features/moderation/utils/moderationReportTarget";

describe("moderation report targets", () => {
  it("builds a user target with the referenced user id", () => {
    expect(buildUserReportTarget({ userId: "user-1", userName: "김우리" })).toEqual({
      targetLabel: "김우리",
      targetType: "USER",
      targetUserId: "user-1",
    });
  });

  it("builds a concise chat target with sender, room, preview, and message id", () => {
    const target = buildChatMessageReportTarget({
      messageId: "message-123456789",
      messageText: "반복되는     불편한 메시지",
      roomName: "우리 크루방",
      senderId: "user-2",
      senderName: "상대방",
    });

    expect(target).toEqual({
      targetLabel: "상대방 · 우리 크루방 · 반복되는 불편한 메시지 (#message-)",
      targetType: "CHAT",
      targetUserId: "user-2",
    });
  });

  it("keeps contextual labels within the Firestore rule limit", () => {
    const target = buildChatMessageReportTarget({
      messageId: "message-long",
      messageText: "가".repeat(200),
      roomName: "아주 긴 채팅방 이름".repeat(10),
      senderId: "user-3",
      senderName: "아주 긴 사용자 이름".repeat(10),
    });

    expect(target.targetLabel.length).toBeLessThanOrEqual(120);
    expect(target.targetLabel.endsWith("...")).toBe(true);
  });
});
