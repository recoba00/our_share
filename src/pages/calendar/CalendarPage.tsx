import { CalendarPlus, Repeat, Sun } from "@phosphor-icons/react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";

const days = Array.from({ length: 35 }, (_, index) => index + 1);

export function CalendarPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">캘린더</h2>
          <Button><CalendarPlus size={18} weight="bold" />일정 등록</Button>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-2">
          {days.map((day) => (
            <div key={day} className="aspect-square rounded-2xl bg-[var(--color-surface-muted)] p-2 text-sm font-semibold">
              {day <= 31 ? day : ""}
              {day === 18 && <span className="mt-1 block rounded-full bg-brand px-2 py-1 text-[10px] text-white">휴무</span>}
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h3 className="text-lg font-bold">일정 옵션</h3>
        <div className="mt-4 space-y-3 text-sm">
          <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-4">
            <input type="checkbox" className="size-4 accent-emerald-500" />
            <Repeat size={18} /> 매년 보여짐
          </label>
          <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-4">
            <input type="checkbox" className="size-4 accent-emerald-500" />
            <Sun size={18} /> 휴무일 체크
          </label>
        </div>
      </Card>
    </div>
  );
}
