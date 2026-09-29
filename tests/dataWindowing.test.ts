import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "../src/features/calendar/types/calendarTypes";
import {
  getCalendarGridRange,
  isEventVisibleOnDate,
} from "../src/features/calendar/utils/calendarEventUtils";
import type { ChatRoom } from "../src/features/chat/types/chatTypes";
import {
  getChatRoomsLeavingRecentWindow,
  mergeChatRooms,
} from "../src/features/chat/utils/chatRoomPagination";
import type { Memo } from "../src/features/memo/types/memoTypes";
import { mergeMemos } from "../src/features/memo/utils/memoPagination";

describe("calendar data windows", () => {
  it("covers every date rendered by the six-week month grid", () => {
    expect(getCalendarGridRange(new Date(2026, 8, 1))).toEqual({
      endDate: "2026-10-10",
      startDate: "2026-08-30",
    });
  });

  it("keeps yearly events visible when their range crosses New Year", () => {
    const event = createCalendarEvent({
      endDate: "2024-01-02",
      repeat: "YEARLY",
      startDate: "2023-12-30",
    });

    expect(isEventVisibleOnDate(event, new Date(2026, 11, 31))).toBe(true);
    expect(isEventVisibleOnDate(event, new Date(2027, 0, 1))).toBe(true);
    expect(isEventVisibleOnDate(event, new Date(2027, 0, 3))).toBe(false);
  });
});

describe("memo data windows", () => {
  it("merges real-time and older pages without duplicates in newest-first order", () => {
    const older = createMemo("older", 10);
    const boundary = createMemo("boundary", 20);
    const newest = createMemo("newest", 30);

    expect(mergeMemos([newest, boundary], [boundary, older]).map((memo) => memo.id)).toEqual([
      "newest",
      "boundary",
      "older",
    ]);
  });
});

describe("chat room data windows", () => {
  it("merges overlapping access buckets without duplicate rooms", () => {
    const family = createChatRoom("family", 30);
    const direct = createChatRoom("direct", 20);
    const privateRoom = createChatRoom("private", 10);

    expect(
      mergeChatRooms([family, privateRoom], [direct, privateRoom]).map((room) => room.id)
    ).toEqual(["family", "direct", "private"]);
  });

  it("keeps rooms pushed out of the recent real-time window", () => {
    const previousBoundary = createChatRoom("boundary", 20);
    const nextNewest = createChatRoom("newest", 40);

    expect(
      getChatRoomsLeavingRecentWindow(
        [createChatRoom("recent", 30), previousBoundary],
        [nextNewest, createChatRoom("recent", 30)]
      ).map((room) => room.id)
    ).toEqual(["boundary"]);
  });
});

function createCalendarEvent(
  overrides: Pick<CalendarEvent, "endDate" | "repeat" | "startDate">
): CalendarEvent {
  return {
    allDay: true,
    category: "FAMILY",
    createdAt: null,
    createdBy: "user-1",
    description: "",
    familyId: "crew-1",
    id: "event-1",
    isDayOff: false,
    title: "연말 일정",
    updatedAt: null,
    visibleTo: [],
    visibility: "FAMILY",
    ...overrides,
  };
}

function createMemo(id: string, seconds: number): Memo {
  return {
    content: id,
    createdAt: { seconds },
    createdBy: "user-1",
    encryptedContent: null,
    encryptionIv: null,
    encryptionSalt: null,
    familyId: "crew-1",
    id,
    title: id,
    type: "PUBLIC",
    updatedAt: { seconds },
    visibleTo: [],
    visibility: "FAMILY",
  };
}

function createChatRoom(id: string, seconds: number): ChatRoom {
  return {
    createdAt: { seconds },
    createdBy: "user-1",
    familyId: "crew-1",
    id,
    lastMessageAt: { seconds },
    lastMessageText: id,
    memberIds: ["user-1"],
    name: id,
    type: "PRIVATE_GROUP",
    updatedAt: { seconds },
  };
}
