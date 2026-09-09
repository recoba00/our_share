import { ChatCircleDots, Plus } from "@phosphor-icons/react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";

export function PollPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black">투표</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              메뉴에서 만들고 채팅방으로 보낼 수 있습니다.
            </p>
          </div>
          <Button><Plus size={18} weight="bold" />투표 만들기</Button>
        </div>
      </Card>
      {["주말 메뉴", "가족 여행 날짜", "청소 담당"].map((title) => (
        <Card key={title}>
          <h3 className="font-bold">{title}</h3>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">진행중 · 가족 전체</p>
          <div className="mt-4 h-2 rounded-full bg-slate-100">
            <div className="h-2 w-2/3 rounded-full bg-brand" />
          </div>
          <Button className="mt-4 w-full" variant="secondary">
            <ChatCircleDots size={18} weight="bold" />채팅방으로 전송
          </Button>
        </Card>
      ))}
    </div>
  );
}
