import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../../lib/firebase/app";
import { getFirebaseErrorMessage } from "../../../lib/firebase/firebaseErrorMessage";
import type {
  CalendarEvent,
  CalendarEventCategory,
  CalendarEventRepeat,
} from "../types/calendarTypes";

type SaveCalendarEventInput = {
  allDay: boolean;
  category: CalendarEventCategory;
  createdBy: string;
  description: string;
  endDate: string;
  familyId: string;
  isDayOff: boolean;
  repeat: CalendarEventRepeat;
  startDate: string;
  title: string;
};

export async function createCalendarEvent(input: SaveCalendarEventInput) {
  validateCalendarEvent(input);

  const eventRef = doc(collection(db, "families", input.familyId, "calendarEvents"));

  await setDoc(eventRef, {
    id: eventRef.id,
    familyId: input.familyId,
    title: input.title.trim(),
    description: input.description.trim(),
    startDate: input.startDate,
    endDate: input.endDate || input.startDate,
    allDay: input.allDay,
    category: input.category,
    repeat: input.repeat,
    isDayOff: input.isDayOff,
    createdBy: input.createdBy,
    visibleTo: [],
    visibility: "FAMILY",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return eventRef.id;
}

export async function updateCalendarEvent({
  eventId,
  input,
}: {
  eventId: string;
  input: SaveCalendarEventInput;
}) {
  validateCalendarEvent(input);

  await updateDoc(doc(db, "families", input.familyId, "calendarEvents", eventId), {
    title: input.title.trim(),
    description: input.description.trim(),
    startDate: input.startDate,
    endDate: input.endDate || input.startDate,
    allDay: input.allDay,
    category: input.category,
    repeat: input.repeat,
    isDayOff: input.isDayOff,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCalendarEvent({
  eventId,
  familyId,
}: {
  eventId: string;
  familyId: string;
}) {
  await deleteDoc(doc(db, "families", familyId, "calendarEvents", eventId));
}

export function subscribeCalendarEvents({
  endDate,
  familyId,
  maxRangeItems = 250,
  maxRecurringItems = 100,
  onChange,
  onError,
  startDate,
  userId,
}: {
  endDate: string;
  familyId: string;
  maxRangeItems?: number;
  maxRecurringItems?: number;
  onChange: (events: CalendarEvent[]) => void;
  onError?: (message: string) => void;
  startDate: string;
  userId: string;
}): Unsubscribe {
  const eventsCollection = collection(db, "families", familyId, "calendarEvents");
  const publicEventsQuery = query(
    eventsCollection,
    where("visibility", "==", "FAMILY"),
    where("repeat", "==", "NONE"),
    where("startDate", "<=", endDate),
    where("endDate", ">=", startDate),
    orderBy("startDate", "asc"),
    orderBy("endDate", "asc"),
    limit(maxRangeItems)
  );
  const privateEventsQuery = query(
    eventsCollection,
    where("visibility", "==", "PRIVATE"),
    where("visibleTo", "array-contains", userId),
    where("repeat", "==", "NONE"),
    where("startDate", "<=", endDate),
    where("endDate", ">=", startDate),
    orderBy("startDate", "asc"),
    orderBy("endDate", "asc"),
    limit(maxRangeItems)
  );
  const publicRecurringEventsQuery = query(
    eventsCollection,
    where("visibility", "==", "FAMILY"),
    where("repeat", "==", "YEARLY"),
    limit(maxRecurringItems)
  );
  const privateRecurringEventsQuery = query(
    eventsCollection,
    where("visibility", "==", "PRIVATE"),
    where("visibleTo", "array-contains", userId),
    where("repeat", "==", "YEARLY"),
    limit(maxRecurringItems)
  );
  const eventBuckets = new Map<string, CalendarEvent[]>();
  const expectedBucketCount = 4;

  function emitMergedEvents() {
    if (eventBuckets.size < expectedBucketCount) {
      return;
    }

    const events = [...eventBuckets.values()]
      .flat()
      .filter(
        (event, index, allEvents) =>
          allEvents.findIndex((nextEvent) => nextEvent.id === event.id) === index
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    onChange(events);
  }

  const subscriptions = [
    subscribeCalendarBucket("public", publicEventsQuery),
    subscribeCalendarBucket("private", privateEventsQuery),
    subscribeCalendarBucket("publicRecurring", publicRecurringEventsQuery),
    subscribeCalendarBucket("privateRecurring", privateRecurringEventsQuery),
  ];

  function subscribeCalendarBucket(
    bucketName: string,
    eventsQuery: ReturnType<typeof query>
  ) {
    return onSnapshot(
      eventsQuery,
      (snapshot) => {
        eventBuckets.set(
          bucketName,
          snapshot.docs.map((eventDoc) => eventDoc.data() as CalendarEvent)
        );
        emitMergedEvents();
      },
      (error) => {
        onError?.(getFirebaseErrorMessage(error));
      }
    );
  }

  return () => {
    subscriptions.forEach((unsubscribe) => unsubscribe());
  };
}

export function subscribeRecentCalendarEvents({
  familyId,
  limitCount = 20,
  maxRecurringItems = 100,
  onChange,
  onError,
  userId,
}: {
  familyId: string;
  limitCount?: number;
  maxRecurringItems?: number;
  onChange: (events: CalendarEvent[]) => void;
  onError?: (message: string) => void;
  userId: string;
}): Unsubscribe {
  const eventsCollection = collection(db, "families", familyId, "calendarEvents");
  const publicEventsQuery = query(
    eventsCollection,
    where("visibility", "==", "FAMILY"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const privateEventsQuery = query(
    eventsCollection,
    where("visibility", "==", "PRIVATE"),
    where("visibleTo", "array-contains", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const publicRecurringEventsQuery = query(
    eventsCollection,
    where("visibility", "==", "FAMILY"),
    where("repeat", "==", "YEARLY"),
    limit(maxRecurringItems)
  );
  const privateRecurringEventsQuery = query(
    eventsCollection,
    where("visibility", "==", "PRIVATE"),
    where("visibleTo", "array-contains", userId),
    where("repeat", "==", "YEARLY"),
    limit(maxRecurringItems)
  );
  const eventBuckets = new Map<string, CalendarEvent[]>();

  function emitMergedEvents() {
    if (eventBuckets.size < 4) {
      return;
    }

    const events = [...eventBuckets.values()]
      .flat()
      .filter(
        (event, index, allEvents) =>
          allEvents.findIndex((nextEvent) => nextEvent.id === event.id) === index
      )
      .sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));

    onChange(events);
  }

  const subscriptions = [
    subscribeCalendarBucket("public", publicEventsQuery),
    subscribeCalendarBucket("private", privateEventsQuery),
    subscribeCalendarBucket("publicRecurring", publicRecurringEventsQuery),
    subscribeCalendarBucket("privateRecurring", privateRecurringEventsQuery),
  ];

  function subscribeCalendarBucket(
    bucketName: string,
    eventsQuery: ReturnType<typeof query>
  ) {
    return onSnapshot(
      eventsQuery,
      (snapshot) => {
        eventBuckets.set(
          bucketName,
          snapshot.docs.map((eventDoc) => eventDoc.data() as CalendarEvent)
        );
        emitMergedEvents();
      },
      (error) => {
        onError?.(getFirebaseErrorMessage(error));
      }
    );
  }

  return () => {
    subscriptions.forEach((unsubscribe) => unsubscribe());
  };
}

function getTime(value: unknown) {
  if (value && typeof value === "object" && "seconds" in value) {
    return Number((value as { seconds: number }).seconds) * 1000;
  }

  return 0;
}

function validateCalendarEvent(input: SaveCalendarEventInput) {
  if (!input.title.trim()) {
    throw new Error("일정 제목을 적어주세요.");
  }

  if (!input.startDate) {
    throw new Error("시작일을 골라주세요.");
  }

  if (input.endDate && input.endDate < input.startDate) {
    throw new Error("종료일은 시작일보다 빠를 수 없어요.");
  }
}
