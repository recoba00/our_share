import type { CalendarEvent } from "../types/calendarTypes";

const dayMs = 24 * 60 * 60 * 1000;

export function createMonthDays(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDate = new Date(year, month, 1);
  const startDate = new Date(year, month, 1 - firstDate.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      date,
      isCurrentMonth: date.getMonth() === month,
      key: toDateInputValue(date),
    };
  });
}

export function getThisMonthEvents(events: CalendarEvent[], baseDate = new Date()) {
  const viewDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);

  return events.filter((event) => isEventVisibleInMonth(event, viewDate));
}

export function getDDayLabel(event: CalendarEvent, baseDate = new Date()) {
  const targetDate = getNextEventDate(event, baseDate);
  const diff = diffCalendarDays(targetDate, baseDate);

  if (diff === 0) {
    return "D-Day";
  }

  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
}

export function isEventVisibleInMonth(event: CalendarEvent, viewDate: Date) {
  return createMonthDays(viewDate).some((day) => isEventVisibleOnDate(event, day.date));
}

export function isEventVisibleOnDate(event: CalendarEvent, date: Date) {
  const target = toDateInputValue(date);

  if (event.repeat === "YEARLY") {
    const start = event.startDate.slice(5);
    const end = event.endDate.slice(5);
    const monthDay = target.slice(5);
    return start <= monthDay && monthDay <= end;
  }

  return event.startDate <= target && target <= event.endDate;
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getNextEventDate(event: CalendarEvent, baseDate: Date) {
  if (event.repeat !== "YEARLY") {
    return parseDateInputValue(event.startDate);
  }

  const monthDay = event.startDate.slice(5);
  const thisYearDate = parseDateInputValue(`${baseDate.getFullYear()}-${monthDay}`);

  if (diffCalendarDays(thisYearDate, baseDate) < 0) {
    return parseDateInputValue(`${baseDate.getFullYear() + 1}-${monthDay}`);
  }

  return thisYearDate;
}

function diffCalendarDays(targetDate: Date, baseDate: Date) {
  return Math.round(
    (startOfDay(targetDate).getTime() - startOfDay(baseDate).getTime()) / dayMs
  );
}

function parseDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
