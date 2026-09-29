import type { CalendarEvent } from "../../calendar/types/calendarTypes";
import { isEventVisibleOnDate } from "../../calendar/utils/calendarEventUtils";
import type { Poll } from "../../poll/types/pollTypes";

export type NotificationAvailability =
  | "SUPPORTED"
  | "UNSUPPORTED"
  | "INSECURE_CONTEXT";

export function getNotificationAvailability(): NotificationAvailability {
  if (!("Notification" in window)) {
    return "UNSUPPORTED";
  }

  if (!window.isSecureContext) {
    return "INSECURE_CONTEXT";
  }

  return "SUPPORTED";
}

export function getNotificationPermission() {
  if (!("Notification" in window)) {
    return "default";
  }

  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (getNotificationAvailability() !== "SUPPORTED") {
    return "denied";
  }

  return Notification.requestPermission();
}

export async function sendBrowserNotification({
  body,
  tag,
  title,
  url = import.meta.env.BASE_URL,
}: {
  body: string;
  tag: string;
  title: string;
  url?: string;
}) {
  if (getNotificationAvailability() !== "SUPPORTED") {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        badge: `${import.meta.env.BASE_URL}pwa-icon-192.png`,
        body,
        data: { url },
        icon: `${import.meta.env.BASE_URL}pwa-icon-192.png`,
        tag,
      });
    } else {
      new Notification(title, {
        body,
        icon: `${import.meta.env.BASE_URL}pwa-icon-192.png`,
        tag,
      });
    }

    const badgeNavigator = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
    };
    void badgeNavigator.setAppBadge?.(1);
  } catch {
    return false;
  }

  return true;
}

export async function notifyDashboardReminders({
  events,
  familyId,
  polls,
  userId,
}: {
  events: CalendarEvent[];
  familyId: string;
  polls: Poll[];
  userId: string;
}) {
  const todayEvents = events.filter(isTodayEvent);
  const closingPolls = polls.filter(isClosingSoonPoll);
  let sentCount = 0;

  for (const event of todayEvents) {
    const reminderKey = createReminderKey({
      familyId,
      id: event.id,
      type: "event",
      userId,
    });

    if (hasReminderSent(reminderKey)) {
      continue;
    }

    if (
      await sendBrowserNotification({
        body: event.isDayOff ? "오늘 휴무일로 체크된 일정이에요." : "오늘 예정된 일정이에요.",
        tag: reminderKey,
        title: event.title,
      })
    ) {
      markReminderSent(reminderKey);
      sentCount += 1;
    }
  }

  for (const poll of closingPolls) {
    const reminderKey = createReminderKey({
      familyId,
      id: poll.id,
      type: "poll",
      userId,
    });

    if (hasReminderSent(reminderKey)) {
      continue;
    }

    if (
      await sendBrowserNotification({
        body: poll.closesAt ? `${formatDate(poll.closesAt)} 마감 예정인 투표예요.` : "마감 예정 투표예요.",
        tag: reminderKey,
        title: poll.title,
      })
    ) {
      markReminderSent(reminderKey);
      sentCount += 1;
    }
  }

  return sentCount;
}

function isTodayEvent(event: CalendarEvent) {
  return isEventVisibleOnDate(event, new Date());
}

function isClosingSoonPoll(poll: Poll) {
  if (!poll.closesAt) {
    return false;
  }

  const now = new Date();
  const closesAt = new Date(poll.closesAt);
  const diffMs = closesAt.getTime() - now.getTime();

  return diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
}

function createReminderKey({
  familyId,
  id,
  type,
  userId,
}: {
  familyId: string;
  id: string;
  type: "event" | "poll";
  userId: string;
}) {
  return `our-share-reminder:${userId}:${familyId}:${type}:${id}:${toDateKey(new Date())}`;
}

function hasReminderSent(key: string) {
  return window.localStorage.getItem(key) === "sent";
}

function markReminderSent(key: string) {
  window.localStorage.setItem(key, "sent");
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}
