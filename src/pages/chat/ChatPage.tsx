import { LockKey, PaperPlaneTilt, UserPlus } from "@phosphor-icons/react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";

export function ChatPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <h2 className="text-xl font-black">채팅</h2>
        <div className="mt-4 grid gap-2">
          <Button><UserPlus size={18} weight="bold" />가족 초대</Button>
          <Button variant="secondary"><LockKey size={18} weight="bold" />비밀방 만들기</Button>
        </div>
        <div className="mt-6 space-y-3">
          {["가족 전체방", "엄마와 나", "비밀방"].map((room) => (
            <div key={room} className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
              <strong>{room}</strong>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">최근 대화가 여기에 표시됩니다.</p>
            </div>
          ))}
        </div>
      </Card>
      <Card className="min-h-[520px]">
        <h3 className="text-lg font-bold">가족 전체방</h3>
        <div className="mt-4 flex min-h-[360px] flex-col justify-end rounded-2xl bg-slate-50 p-4">
          <p className="max-w-[280px] rounded-2xl bg-white p-3 text-sm shadow-sm">
            채팅방에서 바로 투표를 만들고 보낼 수 있어요.
          </p>
        </div>
        <div className="mt-4 flex gap-2">
          <input className="h-11 flex-1 rounded-xl border border-[var(--color-border)] px-4 text-sm outline-none focus:border-brand" placeholder="메시지 입력" />
          <Button><PaperPlaneTilt size={18} weight="bold" />전송</Button>
        </div>
      </Card>
    </div>
  );
}
