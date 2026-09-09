import { Eye, LockKey, NotePencil, Plus } from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { useAuth } from "../../features/auth/useAuth";
import {
  createMemo,
  revealSensitiveMemo,
  subscribeMemos,
} from "../../features/memo/services/memoService";
import type { Memo, MemoType } from "../../features/memo/types/memoTypes";
import { getFirstFamilyForUser } from "../../features/family/services/familyService";

export function MemoPage() {
  const { user } = useAuth();
  const [activeFamily, setActiveFamily] = useState<{
    id: string;
    inviteCode: string;
    name: string;
  } | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [selectedMemoId, setSelectedMemoId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [memoType, setMemoType] = useState<MemoType>("PUBLIC");
  const [createPassword, setCreatePassword] = useState("");
  const [revealPassword, setRevealPassword] = useState("");
  const [revealedContent, setRevealedContent] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const selectedMemo = useMemo(
    () => memos.find((memo) => memo.id === selectedMemoId) ?? memos[0],
    [memos, selectedMemoId]
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

    return subscribeMemos({
      familyId: activeFamily.id,
      onChange: setMemos,
      userId: user.uid,
    });
  }, [activeFamily, user]);

  async function handleCreateMemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeFamily || !user) {
      return;
    }

    try {
      const memoId = await createMemo({
        content,
        createdBy: user.uid,
        familyId: activeFamily.id,
        password: createPassword,
        title,
        type: memoType,
      });
      setTitle("");
      setContent("");
      setCreatePassword("");
      setMemoType("PUBLIC");
      setSelectedMemoId(memoId);
      setStatusMessage("메모를 저장했습니다.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "메모 저장에 실패했습니다.");
    }
  }

  async function handleRevealMemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedMemo) {
      return;
    }

    try {
      const sensitiveContent = await revealSensitiveMemo({
        memo: selectedMemo,
        password: revealPassword,
      });
      setRevealedContent(sensitiveContent);
      setStatusMessage("");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "메모 열람에 실패했습니다.");
    }
  }

  function selectMemo(memoId: string) {
    setSelectedMemoId(memoId);
    setRevealedContent("");
    setRevealPassword("");
  }

  if (!activeFamily) {
    return (
      <Card>
        <h2 className="text-xl font-black">메모</h2>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          홈에서 가족을 만들거나 초대 코드로 참여하면 메모를 사용할 수 있어요.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">메모</h2>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
            {activeFamily.name}
          </span>
        </div>
        <div className="mt-5 grid gap-3">
          {memos.length === 0 ? (
            <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
              <strong>아직 메모가 없습니다.</strong>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                첫 가족 메모를 작성해보세요.
              </p>
            </div>
          ) : (
            memos.map((memo) => (
              <button
                className={`rounded-2xl p-4 text-left transition ${
                  selectedMemo?.id === memo.id
                    ? "bg-emerald-50 ring-2 ring-brand"
                    : "bg-[var(--color-surface-muted)] hover:bg-slate-200"
                }`}
                key={memo.id}
                onClick={() => selectMemo(memo.id)}
                type="button"
              >
                <div className="flex items-center gap-2">
                  {memo.type === "SENSITIVE" ? (
                    <LockKey className="text-brand" size={18} weight="bold" />
                  ) : (
                    <NotePencil className="text-brand" size={18} weight="bold" />
                  )}
                  <strong>{memo.title}</strong>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
                  {memo.type === "PUBLIC"
                    ? memo.content
                    : "개인 비밀번호 확인 후 열람할 수 있습니다."}
                </p>
              </button>
            ))
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold">메모 작성</h3>
        <form className="mt-4 grid gap-3" onSubmit={handleCreateMemo}>
          <Input
            label="제목"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="예: 장보기 목록"
            value={title}
          />
          <label className="grid gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            내용
            <textarea
              className="min-h-32 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-emerald-100"
              onChange={(event) => setContent(event.target.value)}
              placeholder="가족과 공유할 내용을 적어주세요."
              value={content}
            />
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input
              checked={memoType === "SENSITIVE"}
              className="size-4 accent-emerald-500"
              onChange={(event) => setMemoType(event.target.checked ? "SENSITIVE" : "PUBLIC")}
              type="checkbox"
            />
            민감정보 메모로 저장
          </label>
          {memoType === "SENSITIVE" ? (
            <Input
              label="개인 비밀번호"
              onChange={(event) => setCreatePassword(event.target.value)}
              placeholder="열람할 때 사용할 비밀번호"
              type="password"
              value={createPassword}
            />
          ) : null}
          <Button type="submit">
            <Plus size={18} weight="bold" />
            저장
          </Button>
        </form>

        {selectedMemo ? (
          <div className="mt-6 border-t border-[var(--color-border)] pt-5">
            <h3 className="text-lg font-bold">{selectedMemo.title}</h3>
            {selectedMemo.type === "PUBLIC" ? (
              <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-[var(--color-surface-muted)] p-4 text-sm leading-6">
                {selectedMemo.content}
              </p>
            ) : (
              <form className="mt-3 grid gap-3" onSubmit={handleRevealMemo}>
                <Input
                  label="열람 비밀번호"
                  onChange={(event) => setRevealPassword(event.target.value)}
                  placeholder="개인 비밀번호"
                  type="password"
                  value={revealPassword}
                />
                <Button type="submit" variant="secondary">
                  <Eye size={18} weight="bold" />
                  열람하기
                </Button>
                {revealedContent ? (
                  <p className="whitespace-pre-wrap rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                    {revealedContent}
                  </p>
                ) : null}
              </form>
            )}
          </div>
        ) : null}

        {statusMessage ? (
          <p className="mt-4 rounded-xl bg-brand-soft p-3 text-sm font-semibold text-emerald-900">
            {statusMessage}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
