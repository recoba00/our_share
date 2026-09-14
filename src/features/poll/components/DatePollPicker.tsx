import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { IconButton } from "../../../components/common/IconButton";
import {
  createMonthDays,
  toDateInputValue,
} from "../../calendar/utils/calendarEventUtils";

const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];

type DatePollPickerProps = {
  selectedDates: string[];
  setViewDate: (value: Date) => void;
  toggleDate: (dateValue: string) => void;
  viewDate: Date;
};

export function DatePollPicker({
  selectedDates,
  setViewDate,
  toggleDate,
  viewDate,
}: DatePollPickerProps) {
  const monthDays = createMonthDays(viewDate);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">후보 날짜</span>
        <div className="flex items-center gap-1">
          <IconButton
            className="size-9"
            label="이전 달"
            onClick={() => setViewDate(addMonths(viewDate, -1))}
          >
            <CaretLeft size={16} />
          </IconButton>
          <strong className="min-w-20 text-center text-sm font-semibold">
            {viewDate.getFullYear()}.{String(viewDate.getMonth() + 1).padStart(2, "0")}
          </strong>
          <IconButton
            className="size-9"
            label="다음 달"
            onClick={() => setViewDate(addMonths(viewDate, 1))}
          >
            <CaretRight size={16} />
          </IconButton>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[var(--color-text-secondary)]">
        {weekLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((day) => {
          const dateValue = toDateInputValue(day.date);
          const selected = selectedDates.includes(dateValue);

          return (
            <button
              className={`aspect-square rounded-lg text-sm font-semibold transition ${
                selected
                  ? "bg-brand text-white"
                  : day.isCurrentMonth
                    ? "bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]"
                    : "bg-slate-50 text-slate-300"
              }`}
              key={day.key}
              onClick={() => toggleDate(dateValue)}
              type="button"
            >
              {day.date.getDate()}
            </button>
          );
        })}
      </div>
      <div className="flex min-h-10 flex-wrap gap-2">
        {selectedDates.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            날짜를 터치해서 후보를 선택해주세요.
          </p>
        ) : (
          selectedDates.map((date) => (
            <button
              className="rounded-full bg-brand-soft px-3 py-2 text-xs font-semibold text-brand"
              key={date}
              onClick={() => toggleDate(date)}
              type="button"
            >
              {date} 삭제
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}
