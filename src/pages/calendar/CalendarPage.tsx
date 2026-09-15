import {
  CalendarCheck,
  CalendarPlus,
  CaretLeft,
  CaretRight,
  Repeat,
  SealQuestion,
  Sun,
  Trash,
} from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionLayer, MobileCreateButton } from "../../components/common/ActionLayer";
import { AnimatedCheckbox } from "../../components/common/AnimatedCheckbox";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { DesktopWorkspace } from "../../components/layout/DesktopWorkspace";
import { useConfirmDialog } from "../../components/common/confirmDialogContext";
import { IconButton } from "../../components/common/IconButton";
import { Input } from "../../components/common/Input";
import { LoadingState } from "../../components/common/LoadingState";
import { Modal } from "../../components/common/Modal";
import { SectionHeading } from "../../components/common/SectionHeading";
import { SegmentedControl } from "../../components/common/SegmentedControl";
import { useToast } from "../../components/common/toastContext";
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
import {
  createMonthDays,
  getDDayLabel,
  isEventVisibleInMonth,
  isEventVisibleOnDate,
  toDateInputValue,
} from "../../features/calendar/utils/calendarEventUtils";
import { useFamily } from "../../features/family/useFamily";
import { DatePollPicker } from "../../features/poll/components/DatePollPicker";
import { createPoll } from "../../features/poll/services/pollService";

const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];
const categoryOptions: { label: string; value: CalendarEventCategory }[] = [
  { label: "그룹", value: "FAMILY" },
  { label: "개인", value: "PERSONAL" },
  { label: "기념일", value: "ANNIVERSARY" },
  { label: "생일", value: "BIRTHDAY" },
  { label: "기타", value: "ETC" },
];

export function CalendarPage() {
  const { user } = useAuth();
  const { activeFamily, isLoading: isFamilyLoading } = useFamily();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const today = new Date();
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
  const [voteTitle, setVoteTitle] = useState("");
  const [voteDescription, setVoteDescription] = useState("");
  const [voteSelectedDates, setVoteSelectedDates] = useState<string[]>([]);
  const [voteViewDate, setVoteViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailEventId, setDetailEventId] = useState("");
  const reportError = useCallback(
    (message: string) => showToast({ message, variant: "error" }),
    [showToast]
  );

  const monthDays = useMemo(() => createMonthDays(viewDate), [viewDate]);
  const monthEvents = useMemo(
    () => events.filter((event) => isEventVisibleInMonth(event, viewDate)),
    [events, viewDate]
  );
  const detailEvent = useMemo(
    () => events.find((event) => event.id === detailEventId) ?? null,
    [detailEventId, events]
  );
  const canCreateDatePoll = voteTitle.trim().length > 0 && voteSelectedDates.length >= 2;

  useEffect(() => {
    if (!activeFamily || !user) {
      return;
    }

    return subscribeCalendarEvents({
      familyId: activeFamily.id,
      onChange: setEvents,
      onError: reportError,
      userId: user.uid,
    });
  }, [activeFamily, reportError, user]);

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
        notify("일정을 수정했습니다.", "success");
      } else {
        await createCalendarEvent(input);
        notify("일정을 등록했습니다.", "success");
      }

      resetForm();
      setIsCreateOpen(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : "일정 저장에 실패했습니다.", "error");
    }
  }

  async function handleDeleteEvent() {
    if (!editingEventId || !activeFamily) {
      return;
    }

    const confirmed = await confirm({
      confirmLabel: "삭제",
      description: "선택한 일정을 삭제합니다. 삭제한 일정은 되돌릴 수 없습니다.",
      title: "일정을 삭제할까요?",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteCalendarEvent({
        eventId: editingEventId,
        familyId: activeFamily.id,
      });
      resetForm();
      setDetailEventId("");
      setIsCreateOpen(false);
      notify("일정을 삭제했습니다.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "일정 삭제에 실패했습니다.", "error");
    }
  }

  async function handleDeleteSelectedEvent(event: CalendarEvent) {
    if (!activeFamily) {
      return;
    }

    const confirmed = await confirm({
      confirmLabel: "삭제",
      description: `'${event.title}' 일정을 삭제합니다. 삭제한 일정은 되돌릴 수 없습니다.`,
      title: "일정을 삭제할까요?",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteCalendarEvent({
        eventId: event.id,
        familyId: activeFamily.id,
      });
      if (editingEventId === event.id) {
        resetForm();
      }
      setDetailEventId("");
      setIsCreateOpen(false);
      notify("일정을 삭제했습니다.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "일정 삭제에 실패했습니다.", "error");
    }
  }

  async function handleCreateDatePoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeFamily || !user) {
      return;
    }

    try {
      await createPoll({
        createdBy: user.uid,
        description: voteDescription,
        familyId: activeFamily.id,
        multipleChoice: false,
        options: voteSelectedDates,
        title: voteTitle,
        type: "DATE",
      });

      setVoteTitle("");
      setVoteDescription("");
      setVoteSelectedDates([]);
      notify("날짜 투표를 만들었습니다. 투표 메뉴에서 채팅방으로 전송할 수 있어요.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "날짜 투표 생성에 실패했습니다.", "error");
    }
  }

  function notify(message: string, variant: "error" | "info" | "success") {
    showToast({ message, variant });
  }

  function toggleVoteDate(dateValue: string) {
    setVoteSelectedDates((current) =>
      current.includes(dateValue)
        ? current.filter((selectedDate) => selectedDate !== dateValue)
        : [...current, dateValue].sort()
    );
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
    setDetailEventId("");
    setIsCreateOpen(true);
  }

  function openEventDetail(event: CalendarEvent) {
    setDetailEventId(event.id);
  }

  function startNewEventOnDate(date: Date) {
    const nextDate = toDateInputValue(date);
    resetForm();
    setStartDate(nextDate);
    setEndDate(nextDate);
    setIsCreateOpen(true);
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

  if (isFamilyLoading) {
    return <LoadingState title="캘린더 정보를 불러오는 중입니다." />;
  }

  if (!activeFamily) {
    return (
      <Card>
        <h2 className="text-xl font-semibold">캘린더</h2>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          홈에서 그룹을 만들거나 초대 코드로 참여하면 일정을 사용할 수 있어요.
        </p>
      </Card>
    );
  }

  return (
    <>
      <MobileCreateButton
        label="+ 일정"
        onClick={() => {
          resetForm();
          setIsCreateOpen(true);
        }}
      />
      <Modal
        isOpen={Boolean(detailEvent)}
        onClose={() => setDetailEventId("")}
        title={detailEvent?.title ?? "일정"}
      >
        {detailEvent ? (
          <div className="grid gap-4">
            <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
              <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                {detailEvent.startDate}
                {detailEvent.endDate !== detailEvent.startDate ? ` - ${detailEvent.endDate}` : ""}
                {detailEvent.repeat === "YEARLY" ? " · 매년" : ""}
                {detailEvent.isDayOff ? " · 휴무" : ""}
              </p>
              {detailEvent.description ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                  {detailEvent.description}
                </p>
              ) : (
                <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                  등록된 설명이 없습니다.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => editEvent(detailEvent)} type="button" variant="secondary">
                수정
              </Button>
              <Button
                onClick={() => void handleDeleteSelectedEvent(detailEvent)}
                type="button"
                variant="secondary"
              >
                <Trash size={18} weight="bold" />
                삭제
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
      <ActionLayer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingEventId ? "일정 수정" : "일정 등록"}
      >
        <CalendarTools
          allDay={allDay}
          canCreateDatePoll={canCreateDatePoll}
          category={category}
          description={description}
          editingEventId={editingEventId}
          endDate={endDate}
          handleCreateDatePoll={handleCreateDatePoll}
          handleDeleteEvent={handleDeleteEvent}
          handleSaveEvent={handleSaveEvent}
          isDayOff={isDayOff}
          resetForm={resetForm}
          setAllDay={setAllDay}
          setCategory={setCategory}
          setDescription={setDescription}
          setEndDate={setEndDate}
          setIsDayOff={setIsDayOff}
          setRepeat={setRepeat}
          setStartDate={setStartDate}
          setTitle={setTitle}
          setVoteDescription={setVoteDescription}
          setVoteViewDate={setVoteViewDate}
          toggleVoteDate={toggleVoteDate}
          setVoteTitle={setVoteTitle}
          startDate={startDate}
          title={title}
          repeat={repeat}
          voteDescription={voteDescription}
          voteSelectedDates={voteSelectedDates}
          voteViewDate={voteViewDate}
          voteTitle={voteTitle}
        />
      </ActionLayer>

    <DesktopWorkspace sidebar={<Card className="hidden self-start lg:block">
        <CalendarTools
          allDay={allDay}
          canCreateDatePoll={canCreateDatePoll}
          category={category}
          description={description}
          editingEventId={editingEventId}
          endDate={endDate}
          handleCreateDatePoll={handleCreateDatePoll}
          handleDeleteEvent={handleDeleteEvent}
          handleSaveEvent={handleSaveEvent}
          isDayOff={isDayOff}
          resetForm={resetForm}
          setAllDay={setAllDay}
          setCategory={setCategory}
          setDescription={setDescription}
          setEndDate={setEndDate}
          setIsDayOff={setIsDayOff}
          setRepeat={setRepeat}
          setStartDate={setStartDate}
          setTitle={setTitle}
          setVoteDescription={setVoteDescription}
          setVoteViewDate={setVoteViewDate}
          toggleVoteDate={toggleVoteDate}
          setVoteTitle={setVoteTitle}
          startDate={startDate}
          title={title}
          repeat={repeat}
          voteDescription={voteDescription}
          voteSelectedDates={voteSelectedDates}
          voteViewDate={voteViewDate}
          voteTitle={voteTitle}
        />
      </Card>}>

      <Card className="min-w-0">
        <SectionHeading
          action={
            <div className="flex shrink-0 items-center justify-between gap-1 sm:justify-start sm:gap-2">
            <IconButton
              className="size-10 sm:size-11"
              label="이전 달"
              onClick={() => setViewDate(addMonths(viewDate, -1))}
            >
              <CaretLeft size={18} weight="bold" />
            </IconButton>
            <strong className="min-w-20 text-center text-sm sm:min-w-24 sm:text-base">
              {viewDate.getFullYear()}.{String(viewDate.getMonth() + 1).padStart(2, "0")}
            </strong>
            <IconButton
              className="size-10 sm:size-11"
              label="다음 달"
              onClick={() => setViewDate(addMonths(viewDate, 1))}
            >
              <CaretRight size={18} weight="bold" />
            </IconButton>
            </div>
          }
          description={activeFamily.name}
          icon={<CalendarCheck size={20} weight="bold" />}
          title="캘린더"
        />
        <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[var(--color-text-secondary)] sm:gap-2">
          {weekLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-0.5 sm:gap-1">
          {monthDays.map((day) => {
            const dayEvents = monthEvents.filter((event) =>
              isEventVisibleOnDate(event, day.date)
            );
            const hasDayOff = dayEvents.some((event) => event.isDayOff);

            return (
              <div
                className={`aspect-square min-w-0 rounded-lg p-1 text-left text-xs font-semibold transition-[background-color,color,transform] duration-200 hover:bg-emerald-50 active:scale-95 sm:rounded-xl sm:p-2 sm:text-sm ${
                  hasDayOff
                    ? "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200"
                    : day.isCurrentMonth
                    ? "bg-[var(--color-surface-muted)]"
                    : "bg-slate-50 text-slate-300"
                }`}
                key={day.key}
                onClick={() => startNewEventOnDate(day.date)}
                onKeyDown={(keyboardEvent) => {
                  if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                    startNewEventOnDate(day.date);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <span>{day.date.getDate()}</span>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-0.5 sm:mt-2 sm:gap-1">
                  {dayEvents.slice(0, 5).map((event) => (
                    <button
                      aria-label={event.title}
                      className={`grid size-4 place-items-center rounded-full transition-transform duration-200 active:scale-110 sm:size-5 ${
                        event.isDayOff
                          ? "bg-amber-100"
                          : event.repeat === "YEARLY"
                            ? "bg-teal-100"
                            : "bg-emerald-100"
                      }`}
                      key={event.id}
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        openEventDetail(event);
                      }}
                      type="button"
                    >
                      <span
                        className={`size-2 rounded-full ${
                          event.isDayOff
                            ? "bg-amber-400"
                            : event.repeat === "YEARLY"
                              ? "bg-teal-500"
                              : "bg-brand"
                        }`}
                      />
                    </button>
                  ))}
                  {dayEvents.length > 5 ? (
                    <span className="text-[11px] font-normal text-[var(--color-text-secondary)]">
                      +{dayEvents.length - 5}
                    </span>
                  ) : null}
                  {dayEvents.length > 0 ? (
                    <span className="ml-0.5 text-[11px] font-normal text-[var(--color-text-secondary)]">
                      {dayEvents.length}
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
                onClick={() => openEventDetail(event)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong>{event.title}</strong>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                      {getDDayLabel(event)}
                    </span>
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                      {categoryOptions.find((option) => option.value === event.category)?.label}
                    </span>
                  </div>
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

    </DesktopWorkspace>
    </>
  );
}

function CalendarTools({
  allDay,
  canCreateDatePoll,
  category,
  description,
  editingEventId,
  endDate,
  handleCreateDatePoll,
  handleDeleteEvent,
  handleSaveEvent,
  isDayOff,
  resetForm,
  setAllDay,
  setCategory,
  setDescription,
  setEndDate,
  setIsDayOff,
  setRepeat,
  setStartDate,
  setTitle,
  setVoteDescription,
  setVoteViewDate,
  setVoteTitle,
  startDate,
  title,
  toggleVoteDate,
  repeat,
  voteDescription,
  voteSelectedDates,
  voteViewDate,
  voteTitle,
}: {
  allDay: boolean;
  canCreateDatePoll: boolean;
  category: CalendarEventCategory;
  description: string;
  editingEventId: string;
  endDate: string;
  handleCreateDatePoll: (event: FormEvent<HTMLFormElement>) => void;
  handleDeleteEvent: () => void;
  handleSaveEvent: (event: FormEvent<HTMLFormElement>) => void;
  isDayOff: boolean;
  resetForm: () => void;
  setAllDay: (value: boolean) => void;
  setCategory: (value: CalendarEventCategory) => void;
  setDescription: (value: string) => void;
  setEndDate: (value: string | ((currentEndDate: string) => string)) => void;
  setIsDayOff: (value: boolean) => void;
  setRepeat: (value: CalendarEventRepeat) => void;
  setStartDate: (value: string) => void;
  setTitle: (value: string) => void;
  setVoteDescription: (value: string) => void;
  setVoteViewDate: (value: Date) => void;
  setVoteTitle: (value: string) => void;
  startDate: string;
  title: string;
  toggleVoteDate: (dateValue: string) => void;
  repeat: CalendarEventRepeat;
  voteDescription: string;
  voteSelectedDates: string[];
  voteViewDate: Date;
  voteTitle: string;
}) {
  const [activeTab, setActiveTab] = useState<"event" | "poll">("event");
  return (
    <>
      <SegmentedControl
        onChange={setActiveTab}
        options={[
          { icon: <CalendarPlus size={16} weight="bold" />, label: "일정 등록", value: "event" },
          { icon: <SealQuestion size={16} weight="bold" />, label: "날짜 투표", value: "poll" },
        ]}
        value={activeTab}
      />

      {activeTab === "event" ? (
        <div className="mt-4">
          <SectionHeading
            icon={<CalendarPlus size={20} weight="bold" />}
            level="h3"
            title={editingEventId ? "일정 수정" : "일정 등록"}
          />
          <form className="mt-4 grid gap-3" onSubmit={handleSaveEvent}>
            <Input
              label="일정 제목"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 그룹 외식"
              value={title}
            />
            <label className="grid gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
              설명
              <textarea
                className="min-h-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-normal outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-emerald-100"
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
                className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-normal outline-none transition focus:border-brand focus:ring-4 focus:ring-emerald-100"
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
                <AnimatedCheckbox
                  checked={repeat === "YEARLY"}
                  onChange={(event) => setRepeat(event.target.checked ? "YEARLY" : "NONE")}
                />
                <Repeat size={18} />
                매년 보여짐
              </label>
              <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-4">
                <AnimatedCheckbox
                  checked={isDayOff}
                  onChange={(event) => setIsDayOff(event.target.checked)}
                />
                <Sun size={18} />
                휴무일 체크
              </label>
              <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-4">
                <AnimatedCheckbox
                  checked={allDay}
                  onChange={(event) => setAllDay(event.target.checked)}
                />
                종일 일정
              </label>
            </div>
            <Button type="submit">
              <CalendarPlus size={18} />
              {editingEventId ? "수정" : "등록"}
            </Button>
            {editingEventId ? (
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={resetForm} type="button" variant="secondary">
                  새 일정
                </Button>
                <Button onClick={handleDeleteEvent} type="button" variant="secondary">
                  <Trash size={18} />
                  삭제
                </Button>
              </div>
            ) : null}
          </form>
        </div>
      ) : (
        <div className="mt-4">
        <SectionHeading
          icon={<SealQuestion size={20} weight="bold" />}
          level="h3"
          title="날짜 투표 만들기"
        />
        <form className="mt-4 grid gap-3" onSubmit={handleCreateDatePoll}>
          <Input
            label="투표 제목"
            onChange={(event) => setVoteTitle(event.target.value)}
            placeholder="예: 그룹 모임 날짜 정하기"
            value={voteTitle}
          />
          <Input
            label="설명"
            onChange={(event) => setVoteDescription(event.target.value)}
            placeholder="선택 사항"
            value={voteDescription}
          />
          <DatePollPicker
            selectedDates={voteSelectedDates}
            setViewDate={setVoteViewDate}
            toggleDate={toggleVoteDate}
            viewDate={voteViewDate}
          />
          <Button disabled={!canCreateDatePoll} type="submit" variant="secondary">
            <SealQuestion size={18} />
            날짜 투표 생성
          </Button>
          {!canCreateDatePoll ? (
            <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
              제목과 후보 날짜 2개 이상이 필요합니다.
            </p>
          ) : null}
        </form>
        </div>
      )}
    </>
  );
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}
