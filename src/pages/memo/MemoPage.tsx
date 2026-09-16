import { Eye, LockKey, NotePencil, Plus, Trash } from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { ActionLayer, MobileCreateButton } from "../../components/common/ActionLayer";
import { AnimatedCheckbox } from "../../components/common/AnimatedCheckbox";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { DesktopWorkspace } from "../../components/layout/DesktopWorkspace";
import { SectionHeading } from "../../components/common/SectionHeading";
import { useConfirmDialog } from "../../components/common/confirmDialogContext";
import { Input } from "../../components/common/Input";
import { LoadingState } from "../../components/common/LoadingState";
import { useToast } from "../../components/common/toastContext";
import { useAuth } from "../../features/auth/useAuth";
import {
  createMemo,
  deleteMemo,
  revealSensitiveMemo,
  subscribeMemos,
} from "../../features/memo/services/memoService";
import type { Memo, MemoType } from "../../features/memo/types/memoTypes";
import { useFamily } from "../../features/family/useFamily";
import { truncateFamilyName } from "../../features/family/utils/familyName";

export function MemoPage() {
  const { user } = useAuth();
  const { activeFamily, isLoading: isFamilyLoading } = useFamily();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [selectedMemoId, setSelectedMemoId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [memoType, setMemoType] = useState<MemoType>("PUBLIC");
  const [createPassword, setCreatePassword] = useState("");
  const [revealPassword, setRevealPassword] = useState("");
  const [revealedContent, setRevealedContent] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const selectedMemo = useMemo(
    () => memos.find((memo) => memo.id === selectedMemoId) ?? memos[0],
    [memos, selectedMemoId]
  );

  useEffect(() => {
    if (!activeFamily || !user) {
      return;
    }

    return subscribeMemos({
      familyId: activeFamily.id,
      onChange: setMemos,
      onError: (message) => showToast({ message, variant: "error" }),
      userId: user.uid,
    });
  }, [activeFamily, showToast, user]);

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
      setIsCreateOpen(false);
      notify("메모를 저장했어요.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "메모를 저장하지 못했어요.", "error");
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
    } catch (error) {
      notify(error instanceof Error ? error.message : "메모를 열지 못했어요.", "error");
    }
  }

  function selectMemo(memoId: string) {
    setSelectedMemoId(memoId);
    setRevealedContent("");
    setRevealPassword("");
  }

  async function handleDeleteMemo(memo: Memo) {
    if (!activeFamily) {
      return;
    }

    const confirmed = await confirm({
      confirmLabel: "삭제",
      description: `'${memo.title}' 메모를 삭제해요. 되돌릴 수 없어요.`,
      title: "메모를 삭제할까요?",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteMemo({
        familyId: activeFamily.id,
        memoId: memo.id,
      });
      if (selectedMemoId === memo.id) {
        setSelectedMemoId("");
        setRevealedContent("");
        setRevealPassword("");
      }
      notify("메모를 삭제했어요.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "메모를 삭제하지 못했어요.", "error");
    }
  }

  function notify(message: string, variant: "error" | "info" | "success") {
    showToast({ message, variant });
  }

  if (isFamilyLoading) {
    return <LoadingState title="메모를 불러오는 중이에요." />;
  }

  if (!activeFamily) {
    return (
      <Card>
        <h2 className="text-xl font-semibold">메모</h2>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          홈에서 크루를 만들거나 초대 코드로 참여하면 메모를 사용할 수 있어요.
        </p>
      </Card>
    );
  }

  const createMemoForm = (
    <>
      <SectionHeading
        icon={<NotePencil size={20} weight="bold" />}
        level="h3"
        title="메모 작성"
      />
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
            className="min-h-32 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-normal text-[var(--color-text-primary)] outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-emerald-100"
            onChange={(event) => setContent(event.target.value)}
            placeholder="크루와 공유할 내용을 적어주세요."
            value={content}
          />
        </label>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <AnimatedCheckbox
            checked={memoType === "SENSITIVE"}
            onChange={(event) => setMemoType(event.target.checked ? "SENSITIVE" : "PUBLIC")}
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
    </>
  );

  return (
    <>
      <MobileCreateButton label="+ 메모" onClick={() => setIsCreateOpen(true)} />
      <ActionLayer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="메모 작성"
      >
        {createMemoForm}
      </ActionLayer>

    <DesktopWorkspace sidebar={<Card className="hidden lg:block">{createMemoForm}</Card>}>
      <Card>
        <SectionHeading
          action={
            <span className="block max-w-[min(40vw,180px)] truncate rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
              {truncateFamilyName(activeFamily.name)}
            </span>
          }
          icon={<NotePencil size={20} weight="bold" />}
          title="최근 메모"
        />
        <div className="mt-4 grid gap-3">
          {memos.length === 0 ? (
            <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
              <strong>아직 메모가 없어요.</strong>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                첫 크루 메모를 작성해보세요.
              </p>
            </div>
          ) : (
            memos.map((memo) => (
              <div
                className={`rounded-2xl p-4 text-left transition ${
                  selectedMemo?.id === memo.id
                    ? "bg-emerald-50 ring-2 ring-brand"
                    : "bg-[var(--color-surface-muted)] hover:bg-slate-200"
                }`}
                key={memo.id}
              >
                <button
                  className="w-full text-left"
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
                      : "개인 비밀번호를 확인하면 열어볼 수 있어요."}
                  </p>
                </button>
                <div className="mt-3 flex justify-end">
                  <Button
                    onClick={() => void handleDeleteMemo(memo)}
                    type="button"
                    variant="secondary"
                  >
                    <Trash size={18} weight="bold" />
                    삭제
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedMemo ? (
          <div className="mt-6">
            <SectionHeading
              icon={
                selectedMemo.type === "SENSITIVE" ? (
                  <LockKey size={20} weight="bold" />
                ) : (
                  <NotePencil size={20} weight="bold" />
                )
              }
              level="h3"
              title={selectedMemo.title}
            />
            {selectedMemo.type === "PUBLIC" ? (
              <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-[var(--color-surface-muted)] p-4 text-sm leading-6">
                {selectedMemo.content}
              </p>
            ) : (
              <form className="mt-4 grid gap-3" onSubmit={handleRevealMemo}>
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

      </Card>
    </DesktopWorkspace>
    </>
  );
}
