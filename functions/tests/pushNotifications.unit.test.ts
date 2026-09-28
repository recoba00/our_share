import { describe, expect, it } from "vitest";

import {
  buildChatPushMessage,
  buildContentPushMessage,
  resolveAudienceUserIds,
} from "../src/pushNotifications";

describe("push notification helpers", () => {
  it("removes the sender and duplicate users from a crew audience", () => {
    expect(
      resolveAudienceUserIds({
        allMemberIds: ["owner", "member", "member"],
        audience: { createdBy: "owner" },
      })
    ).toEqual(["member"]);
  });

  it("uses explicit room members for private chat notifications", () => {
    expect(
      resolveAudienceUserIds({
        allMemberIds: ["outsider"],
        audience: {
          createdBy: "sender",
          memberIds: ["sender", "receiver"],
        },
      })
    ).toEqual(["receiver"]);
  });

  it("uses the full crew for a crew room with an empty member list", () => {
    expect(
      resolveAudienceUserIds({
        allMemberIds: ["sender", "member-a", "member-b"],
        audience: { createdBy: "sender", memberIds: [] },
      })
    ).toEqual(["member-a", "member-b"]);
  });

  it("does not expose sensitive memo titles in the notification body", () => {
    expect(
      buildContentPushMessage({
        id: "memo-a",
        kind: "memo",
        sensitive: true,
        title: "은행 비밀번호",
      })
    ).toMatchObject({
      body: "민감 메모를 확인해주세요.",
      url: "/memo",
    });
  });

  it("links chat notifications directly to their room", () => {
    expect(
      buildChatPushMessage({ roomId: "room/a", roomName: "친구방", text: "안녕" })
    ).toMatchObject({
      body: "안녕",
      title: "친구방",
      url: "/chat/room%2Fa",
    });
  });
});
