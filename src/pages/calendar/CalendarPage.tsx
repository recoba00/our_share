import {
  CalendarPlus,
  CaretLeft,
  CaretRight,
  Repeat,
  Sun,
  Trash,
} from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { IconButton } from "../../components/common/IconButton";
import { Input } from "../../components/common/Input";
import { useAuth } from "../../features/auth/useAuth";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  subscribeCalendarEvents,
  updateCalendarEvent,
} from "../../features/calendar/services/calendarService";
import type {
  CalendarEvent,
  CalendarEventCategory,
  CalendarEventRepeat,
} from "../../features/calendar/types/calendarTypes";
import { getFirstFamilyForUser } from "../../features/family/services/familyService";

const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];
const categoryOptions: { label: string; value: CalendarEventCategory }[] = [
  { label: "가족", value: "FAMILY" },
  { label: "개인", value: "PERSONAL" },
  { label: "기념일", value: "ANNIVERSARY" },
  { label: "생일", value: "BIRTHDAY" },
  { label: "기타", value: "ETC" },
];

export function CalendarPage() {
  const { user } = useAuth();
  const today = new Date();
  const [activeFamily, setActiveFamily] = useState<{
    id: string;
    inviteCode: string;
    name: string;
  } | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewDate, setViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [editingEventId, setEditingEventId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(toDateInputValue(today));
  const [endDate, setEndDate] = useState(toDateInputValue(today));
  const [category, setCategory] = useState<CalendarEventCategory>("FAMILY");
  const [repeat, setRepeat] = useState<CalendarEventRepeat>("NONE");
  const [allDay, setAllDay] = useState(true);
  const [isDayOff, setIsDayOff] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const monthDays = useMemo(() => createMonthDays(viewDate), [viewDate]);
  const monthEvents = useMemo(
    () => events.filter((event) => isEventVisibleInMonth(event, viewDate)),
    [events, viewDate]
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;
    const userId = user.uid;

    async function loadFamily() {
      const family = await getFirstFamilyForUser(userId);

      if (active) {
        setActiveFamily(family);
      }
    }

    loadFamily().catch((error: Error) => setStatusMessage(error.message));

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!activeFamily || !user) {
      return;
    }

    return subscribeCalendarEvents({
      familyId: activeFamily.id,
      onChange: setEvents,
      userId: user.uid,
    });
  }, [activeFamily, user]);

  async function handleSaveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeFamily || !user) {
      return;
    }

    const input = {
      allDay,
      category,
      createdBy: user.uid,
      description,
      endDate,
      familyId: activeFamily.id,
      isDayOff,
      repeat,
      startDate,
      title,
    };

    try {
      if (editingEventId) {
        await updateCalendarEvent({ eventId: editingEventId, input });
        setStatusMessage("일정을 수정했습니다.");
      } else {
        await createCalendarEvent(input);
        setStatusMessage("일정을 등록했습니다.");
      }

      resetForm();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "일정 저장에 실패했습니다.");
    }
  }

  async function handleDeleteEvent() {
    if (!editingEventId) {
      return;
    }

    try {
      await deleteCalendarEvent(editingEventId);
      resetForm();
      setStatusMessage("일정을 삭제했습니다.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "일정 삭제에 실패했습니다.");
    }
  }

  function editEvent(event: CalendarEvent) {
    setEditingEventId(event.id);
    setTitle(event.title);
    setDescription(event.description);
    setStartDate(event.startDate);
    setEndDate(event.endDate);
    setCategory(event.category);
    setRepeat(event.repeat);
    setAllDay(event.allDay);
    setIsDayOff(event.isDayOff);
    setStatusMessage("");
  }

  function resetForm() {
    setEditingEventId("");
    setTitle("");
    setDescription("");
    setStartDate(toDateInputValue(today));
    setEndDate(toDateInputValue(today));
    setCategory("FAMILY");
    setRepeat("NONE");
    setAllDay(true);
    setIsDayOff(false);
  }

  if (!activeFamily) {
    return (
      <Card>
        <h2 className="text-xl font-black">캘린더</h2>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          홈에서 가족을 만들거나 초대 코드로 참여하면 일정을 사용할 수 있어요.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">캘린더</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {activeFamily.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <IconButton
              label="이전 달"
              onClick={() => setViewDate(addMonths(viewDate, -1))}
            >
              <CaretLeft size={18} weight="bold" />
            </IconButton>
            <strong className="min-w-24 text-center">
              {viewDate.getFullYear()}.{String(viewDate.getMonth() + 1).padStart(2, "0")}
            </strong>
            <IconButton
              label="다음 달"
              onClick={() => setViewDate(addMonths(viewDate, 1))}
            >
              <CaretRight size={18} weight="bold" />
            </IconButton>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-bold text-[var(--color-text-secondary)]">
          {weekLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {monthDays.map((day) => {
            const dayEvents = monthEvents.filter((event) =>
              isEventVisibleOnDate(event, day.date)
            );

            return (
              <div
                className={`min-h-24 rounded-2xl p-2 text-sm font-semibold ${
                  day.isCurrentMonth
                    ? "bg-[var(--color-surface-muted)]"
                    : "bg-slate-50 text-slate-300"
                }`}
                key={day.key}
              >
                <span>{day.date.getDate()}</span>
                <div className="mt-1 grid gap-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <button
                      className={`truncate rounded-full px-2 py-1 text-left text-[10px] font-bold ${
                        event.isDayOff
                          ? "bg-amber-100 text-amber-800"
                          : "bg-brand text-white"
                      }`}
                      key={event.id}
                      onClick={() => editEvent(event)}
                      type="button"
                    >
                      {event.repeat === "YEARLY" ? "↻ " : ""}
                      {event.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 ? (
                    <span className="text-[10px] text-[var(--color-text-secondary)]">
                      +{dayEvents.length - 3}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 grid gap-3">
          {monthEvents.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-[var(--color-text-secondary)]">
              이번 달 등록된 일정이 없습니다.
            </p>
          ) : (
            monthEvents.map((event) => (
              <button
                className="rounded-2xl bg-slate-50 p-4 text-left hover:bg-slate-100"
                key={event.id}
                onClick={() => editEvent(event)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong>{event.title}</strong>
                  <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
                    {categoryOptions.find((option) => option.value === event.category)?.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {event.startDate}
                  {event.endDate !== event.startDate ? ` - ${event.endDate}` : ""}
                  {event.repeat === "YEARLY" ? " · 매년" : ""}
                  {event.isDayOff ? " · 휴무" : ""}
                </p>
              </button>
            ))
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold">
          {editingEventId ? "일정 수정" : "일정 등록"}
        </h3>
        <form className="mt-4 grid gap-3" onSubmit={handleSaveEvent}>
          <Input
            label="일정 제목"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="예: 가족 외식"
            value={title}
          />
          <label className="grid gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            설명
            <textarea
              className="min-h-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-emerald-100"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="일정 메모를 적어주세요."
              value={description}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="시작일"
              onChange={(event) => {
                setStartDate(event.target.value);
                setEndDate((currentEndDate) =>
                  currentEndDate < event.target.value ? event.target.value : currentEndDate
                );
              }}
              type="date"
              value={startDate}
            />
            <Input
              label="종료일"
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              value={endDate}
            />
          </div>
          <label className="grid gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            분류
            <select
              className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium outline-none transition focus:border-brand focus:ring-4 focus:ring-emerald-100"
              onChange={(event) => setCategory(event.target.value as CalendarEventCategory)}
              value={category}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-3 text-sm">
            <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-4">
              <input
                checked={repeat === "YEARLY"}
                className="size-4 accent-emerald-500"
                onChange={(event) => setRepeat(event.target.checked ? "YEARLY" : "NONE")}
                type="checkbox"
              />
              <Repeat size={18} />
              매년 보여짐
            </label>
            <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-4">
              <input
                checked={isDayOff}
                className="size-4 accent-emerald-500"
                onChange={(event) => setIsDayOff(event.target.checked)}
                type="checkbox"
              />
              <Sun size={18} />
              휴무일 체크
            </label>
            <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-4">
              <input
                checked={allDay}
                className="size-4 accent-emerald-500"
                onChange={(event) => setAllDay(event.target.checked)}
                type="checkbox"
              />
              종일 일정
            </label>
          </div>
          <Button type="submit">
            <CalendarPlus size={18} weight="bold" />
            {editingEventId ? "수정" : "등록"}
          </Button>
          {editingEventId ? (
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={resetForm} type="button" variant="secondary">
                새 일정
              </Button>
              <Button onClick={handleDeleteEvent} type="button" variant="secondary">
                <Trash size={18} weight="bold" />
                삭제
              </Button>
            </div>
          ) : null}
        </form>
        {statusMessage ? (
          <p className="mt-4 rounded-xl bg-brand-soft p-3 text-sm font-semibold text-emerald-900">
            {statusMessage}
          </p>
        ) : null}
      </Card>
    </div>
  );
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function createMonthDays(viewDate: Date) {
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

function isEventVisibleInMonth(event: CalendarEvent, viewDate: Date) {
  return createMonthDays(viewDate).some((day) => isEventVisibleOnDate(event, day.date));
}

function isEventVisibleOnDate(event: CalendarEvent, date: Date) {
  const target = toDateInputValue(date);

  if (event.repeat === "YEARLY") {
    const start = event.startDate.slice(5);
    const end = event.endDate.slice(5);
    const monthDay = target.slice(5);
    return start <= monthDay && monthDay <= end;
  }

  return event.startDate <= target && target <= event.endDate;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
