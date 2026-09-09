import { Eye, LockKey, Plus } from "@phosphor-icons/react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";

export function MemoPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">메모</h2>
          <Button><Plus size={18} weight="bold" />작성</Button>
        </div>
        <div className="mt-5 grid gap-3">
          <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
            <strong>일반 메모</strong>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">장보기 목록 공유</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center gap-2">
              <LockKey className="text-brand" size={18} weight="bold" />
              <strong>민감정보 메모</strong>
            </div>
            <p className="mt-1 text-sm text-emerald-800">개인 비밀번호 확인 후 열람</p>
          </div>
        </div>
      </Card>
      <Card>
        <h3 className="text-lg font-bold">민감정보 열람</h3>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <input type="checkbox" className="size-4 accent-emerald-500" />
          민감정보 메모로 저장
        </label>
        <input className="mt-4 h-11 w-full rounded-xl border border-[var(--color-border)] px-4 text-sm outline-none focus:border-brand" placeholder="개인 비밀번호" type="password" />
        <Button className="mt-3 w-full"><Eye size={18} weight="bold" />열람하기</Button>
      </Card>
    </div>
  );
}
