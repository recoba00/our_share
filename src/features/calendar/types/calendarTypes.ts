export type CalendarEventCategory =
  | "FAMILY"
  | "PERSONAL"
  | "ANNIVERSARY"
  | "BIRTHDAY"
  | "ETC";

export type CalendarEventRepeat = "NONE" | "YEARLY";

export type CalendarEvent = {
  id: string;
  familyId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  category: CalendarEventCategory;
  repeat: CalendarEventRepeat;
  isDayOff: boolean;
  createdBy: string;
  visibleTo: string[];
  createdAt: unknown;
  updatedAt: unknown;
};
