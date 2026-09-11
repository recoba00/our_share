import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
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
  familyId,
  onChange,
  onError,
  userId,
}: {
  familyId: string;
  onChange: (events: CalendarEvent[]) => void;
  onError?: (message: string) => void;
  userId: string;
}): Unsubscribe {
  const publicEventsQuery = query(
    collection(db, "families", familyId, "calendarEvents"),
    where("visibility", "==", "FAMILY")
  );
  const privateEventsQuery = query(
    collection(db, "families", familyId, "calendarEvents"),
    where("visibility", "==", "PRIVATE"),
    where("visibleTo", "array-contains", userId)
  );
  const eventBuckets = new Map<string, CalendarEvent[]>();

  function emitMergedEvents() {
    const events = [...eventBuckets.values()]
      .flat()
      .filter(
        (event, index, allEvents) =>
          allEvents.findIndex((nextEvent) => nextEvent.id === event.id) === index
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    onChange(events);
  }

  const unsubscribePublicEvents = onSnapshot(
    publicEventsQuery,
    (snapshot) => {
      eventBuckets.set(
        "public",
        snapshot.docs.map((eventDoc) => eventDoc.data() as CalendarEvent)
      );
      emitMergedEvents();
    },
    (error) => {
      onError?.(getFirebaseErrorMessage(error));
    }
  );
  const unsubscribePrivateEvents = onSnapshot(
    privateEventsQuery,
    (snapshot) => {
      eventBuckets.set(
        "private",
        snapshot.docs.map((eventDoc) => eventDoc.data() as CalendarEvent)
      );
      emitMergedEvents();
    },
    (error) => {
      onError?.(getFirebaseErrorMessage(error));
    }
  );

  return () => {
    unsubscribePublicEvents();
    unsubscribePrivateEvents();
  };
}

function validateCalendarEvent(input: SaveCalendarEventInput) {
  if (!input.title.trim()) {
    throw new Error("일정 제목을 입력해주세요.");
  }

  if (!input.startDate) {
    throw new Error("시작일을 선택해주세요.");
  }

  if (input.endDate && input.endDate < input.startDate) {
    throw new Error("종료일은 시작일보다 빠를 수 없습니다.");
  }
}
