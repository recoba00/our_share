import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";
import { subscribeCalendarEvents } from "../../features/calendar/services/calendarService";
import type { CalendarEvent } from "../../features/calendar/types/calendarTypes";
import { subscribeChatRooms } from "../../features/chat/services/chatService";
import type { ChatRoom } from "../../features/chat/types/chatTypes";
import { getTimestampMilliseconds } from "../../features/chat/utils/chatMessagePreview";
import { useFamily } from "../../features/family/useFamily";
import { subscribeMemos } from "../../features/memo/services/memoService";
import {
  getNotificationPermission,
  notifyDashboardReminders,
  sendBrowserNotification,
} from "../../features/notification/services/notificationService";
import { refreshPushDeviceRegistration } from "../../features/notification/services/pushNotificationService";
import { subscribePolls } from "../../features/poll/services/pollService";
import type { Poll } from "../../features/poll/types/pollTypes";

export const notificationPermissionChangedEvent =
  "our-share:notification-permission-changed";

export function NotificationManager() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { activeFamily } = useFamily();
  const [permissionVersion, setPermissionVersion] = useState(0);
  const pathnameRef = useRef(pathname);
  const roomStateRef = useRef<Map<string, number> | null>(null);
  const eventIdsRef = useRef<Set<string> | null>(null);
  const pollIdsRef = useRef<Set<string> | null>(null);
  const memoIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    function handlePermissionChange() {
      setPermissionVersion((version) => version + 1);
    }

    window.addEventListener(notificationPermissionChangedEvent, handlePermissionChange);

    return () => {
      window.removeEventListener(notificationPermissionChangedEvent, handlePermissionChange);
    };
  }, []);

  useEffect(() => {
    if (!user || getNotificationPermission() !== "granted") {
      return;
    }

    void refreshPushDeviceRegistration(user.uid);
  }, [permissionVersion, user]);

  useEffect(() => {
    function clearBadge() {
      if (document.visibilityState !== "visible") {
        return;
      }

      const badgeNavigator = navigator as Navigator & {
        clearAppBadge?: () => Promise<void>;
      };
      void badgeNavigator.clearAppBadge?.();
    }

    document.addEventListener("visibilitychange", clearBadge);
    window.addEventListener(notificationPermissionChangedEvent, clearBadge);
    clearBadge();

    return () => {
      document.removeEventListener("visibilitychange", clearBadge);
      window.removeEventListener(notificationPermissionChangedEvent, clearBadge);
    };
  }, []);

  useEffect(() => {
    roomStateRef.current = null;
    eventIdsRef.current = null;
    pollIdsRef.current = null;
    memoIdsRef.current = null;

    if (!activeFamily || !user || getNotificationPermission() !== "granted") {
      return;
    }

    const familyId = activeFamily.id;
    const baseUrl = import.meta.env.BASE_URL;
    const userId = user.uid;
    let currentEvents: CalendarEvent[] = [];
    let currentPolls: Poll[] = [];

    function remindDashboard() {
      void notifyDashboardReminders({
        events: currentEvents,
        familyId,
        polls: currentPolls,
        userId,
      });
    }

    const unsubscribes = [
      subscribeChatRooms({
        familyId,
        onChange: (rooms) => notifyChangedRooms(rooms, userId, baseUrl, pathnameRef, roomStateRef),
        userId,
      }),
      subscribeCalendarEvents({
        familyId,
        onChange: (events) => {
          notifyNewItems({
            body: (event) => event.title,
            currentUserId: userId,
            items: events,
            previousIdsRef: eventIdsRef,
            tagPrefix: `calendar:${familyId}`,
            title: "새 일정이 등록됐어요",
            url: `${baseUrl}calendar`,
          });
          currentEvents = events;
          remindDashboard();
        },
        userId,
      }),
      subscribePolls({
        familyId,
        onChange: (polls) => {
          notifyNewItems({
            body: (poll) => poll.title,
            currentUserId: userId,
            items: polls,
            previousIdsRef: pollIdsRef,
            tagPrefix: `poll:${familyId}`,
            title: "새 투표가 열렸어요",
            url: `${baseUrl}poll`,
          });
          currentPolls = polls;
          remindDashboard();
        },
      }),
      subscribeMemos({
        familyId,
        onChange: (memos) => {
          notifyNewItems({
            body: (memo) => memo.type === "SENSITIVE" ? "민감 메모를 확인해주세요." : memo.title,
            currentUserId: userId,
            items: memos,
            previousIdsRef: memoIdsRef,
            tagPrefix: `memo:${familyId}`,
            title: "새 메모가 도착했어요",
            url: `${baseUrl}memo`,
          });
        },
        userId,
      }),
    ];

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [activeFamily, permissionVersion, user]);

  return null;
}

function notifyChangedRooms(
  rooms: ChatRoom[],
  userId: string,
  baseUrl: string,
  pathnameRef: MutableRefObject<string>,
  previousRoomsRef: MutableRefObject<Map<string, number> | null>
) {
  const nextRoomState = new Map(
    rooms.map((room) => [room.id, getTimestampMilliseconds(room.lastMessageAt)])
  );
  const previousRoomState = previousRoomsRef.current;
  previousRoomsRef.current = nextRoomState;

  if (!previousRoomState) {
    return;
  }

  rooms.forEach((room) => {
    const nextMessageAt = nextRoomState.get(room.id) ?? 0;
    const previousMessageAt = previousRoomState.get(room.id) ?? 0;
    const isViewingRoom = pathnameRef.current === `/chat/${room.id}` && document.visibilityState === "visible";

    if (
      nextMessageAt <= previousMessageAt ||
      room.lastMessageCreatedBy === userId ||
      !room.lastMessageText ||
      isViewingRoom
    ) {
      return;
    }

    void sendBrowserNotification({
      body: truncateNotificationBody(room.lastMessageText),
      tag: `chat:${room.familyId}:${room.id}:${nextMessageAt}`,
      title: room.name,
      url: `${baseUrl}chat/${room.id}`,
    });
  });
}

function notifyNewItems<T extends { createdBy: string; id: string }>({
  body,
  currentUserId,
  items,
  previousIdsRef,
  tagPrefix,
  title,
  url,
}: {
  body: (item: T) => string;
  currentUserId: string;
  items: T[];
  previousIdsRef: MutableRefObject<Set<string> | null>;
  tagPrefix: string;
  title: string;
  url: string;
}) {
  const nextIds = new Set(items.map((item) => item.id));
  const previousIds = previousIdsRef.current;
  previousIdsRef.current = nextIds;

  if (!previousIds) {
    return;
  }

  items.forEach((item) => {
    if (previousIds.has(item.id) || item.createdBy === currentUserId) {
      return;
    }

    void sendBrowserNotification({
      body: truncateNotificationBody(body(item)),
      tag: `${tagPrefix}:${item.id}`,
      title,
      url,
    });
  });
}

function truncateNotificationBody(value: string) {
  const normalizedValue = value.trim();
  return normalizedValue.length > 80
    ? `${normalizedValue.slice(0, 80)}...`
    : normalizedValue;
}
