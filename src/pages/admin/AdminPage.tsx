import {
  Megaphone,
  NotePencil,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ActionLayer, MobileCreateButton } from "../../components/common/ActionLayer";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { IconButton } from "../../components/common/IconButton";
import { Input } from "../../components/common/Input";
import { SegmentedControl } from "../../components/common/SegmentedControl";
import { useConfirmDialog } from "../../components/common/confirmDialogContext";
import { useToast } from "../../components/common/toastContext";
import { DesktopWorkspace } from "../../components/layout/DesktopWorkspace";
import {
  createServiceNotice,
  deleteServiceNotice,
  subscribeAdminServiceNotices,
  updateServiceNotice,
} from "../../features/admin/services/serviceNoticeService";
import type {
  ServiceNotice,
  ServiceNoticeDraft,
  ServiceNoticeStatus,
} from "../../features/admin/types/serviceNoticeTypes";
import { useAuth } from "../../features/auth/useAuth";

const emptyDraft: ServiceNoticeDraft = {
  body: "",
  status: "DRAFT",
  title: "",
};

export function AdminPage() {
  const { user } = useAuth();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const [notices, setNotices] = useState<ServiceNotice[]>([]);
  const [visibleStatus, setVisibleStatus] = useState<ServiceNoticeStatus>("PUBLISHED");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<ServiceNotice | null>(null);
  const [draft, setDraft] = useState<ServiceNoticeDraft>(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(
    () =>
      subscribeAdminServiceNotices({
        onChange: (nextNotices) => {
          setNotices(nextNotices);
          setErrorMessage("");
          setIsLoading(false);
        },
        onError: (message) => {
          setErrorMessage(message);
          setIsLoading(false);
        },
      }),
    []
  );

  const filteredNotices = useMemo(
    () => notices.filter((notice) => notice.status === visibleStatus),
    [notices, visibleStatus]
  );
  const publishedCount = notices.filter((notice) => notice.status === "PUBLISHED").length;
  const draftCount = notices.length - publishedCount;

  function openCreateEditor() {
    setEditingNotice(null);
    setDraft(emptyDraft);
    setIsEditorOpen(true);
  }

  function openEditEditor(notice: ServiceNotice) {
    setEditingNotice(notice);
    setDraft({ body: notice.body, status: notice.status, title: notice.title });
    setIsEditorOpen(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setIsSaving(true);

    try {
      if (editingNotice) {
        await updateServiceNotice({ draft, noticeId: editingNotice.id });
        showToast({ message: "공지를 수정했어요.", variant: "success" });
      } else {
        await createServiceNotice({ createdBy: user.uid, draft });
        showToast({
          message: draft.status === "PUBLISHED" ? "공지를 게시했어요." : "공지를 임시 저장했어요.",
          variant: "success",
        });
      }

      setIsEditorOpen(false);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "공지를 저장하지 못했어요.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(notice: ServiceNotice) {
    const confirmed = await confirm({
      confirmLabel: "삭제",
      description: `‘${notice.title}’ 공지를 삭제해요. 되돌릴 수 없어요.`,
      title: "공지를 삭제할까요?",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteServiceNotice(notice.id);
      showToast({ message: "공지를 삭제했어요.", variant: "success" });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "공지를 삭제하지 못했어요.",
        variant: "error",
      });
    }
  }

  const editorForm = (
    <form className="mx-auto grid w-full max-w-2xl gap-4" onSubmit={handleSave}>
      <Input
        autoFocus
        label="제목"
        maxLength={80}
        onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
        placeholder="공지 제목을 적어주세요."
        value={draft.title}
      />
      <label className="grid gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
        내용
        <textarea
          className="min-h-64 resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-normal leading-6 text-[var(--color-text-primary)] outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-emerald-100"
          inputMode="text"
          lang="ko"
          maxLength={2000}
          onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
          placeholder="사용자에게 전할 내용을 간결하게 적어주세요."
          value={draft.body}
        />
        <span className="text-right text-xs font-normal text-[var(--color-text-secondary)]">
          {draft.body.length}/2,000
        </span>
      </label>
      <div className="grid gap-2">
        <span className="text-sm font-semibold">게시 상태</span>
        <SegmentedControl
          onChange={(status) => setDraft((current) => ({ ...current, status }))}
          options={[
            { label: "임시 저장", value: "DRAFT" },
            { label: "바로 게시", value: "PUBLISHED" },
          ]}
          value={draft.status}
        />
      </div>
      <Button disabled={isSaving} loading={isSaving} type="submit">
        {editingNotice ? "수정하기" : draft.status === "PUBLISHED" ? "게시하기" : "저장하기"}
      </Button>
    </form>
  );

  return (
    <>
      <MobileCreateButton label="+ 공지" onClick={openCreateEditor} />
      <DesktopWorkspace
        sidebar={
          <Card>
            <p className="text-xs font-semibold text-brand">운영자 도구</p>
            <h2 className="mt-1 text-xl font-semibold">공지 관리</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              서비스 변경과 중요한 안내를 작성하고 게시해요.
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-2">
              <StatusCount label="게시 중" value={publishedCount} />
              <StatusCount label="임시 저장" value={draftCount} />
            </dl>
          </Card>
        }
      >
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold">공지사항</h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                게시된 공지는 설정에서 바로 확인할 수 있어요.
              </p>
            </div>
            <Button className="hidden shrink-0 lg:inline-flex" onClick={openCreateEditor} type="button">
              <Plus size={18} weight="regular" />
              공지 작성
            </Button>
          </div>

          <div className="mt-5">
            <SegmentedControl
              onChange={setVisibleStatus}
              options={[
                { label: `게시 중 ${publishedCount}`, value: "PUBLISHED" },
                { label: `임시 저장 ${draftCount}`, value: "DRAFT" },
              ]}
              value={visibleStatus}
            />
          </div>

          {isLoading ? (
            <p className="mt-4 rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-secondary)]">
              공지를 불러오는 중이에요.
            </p>
          ) : null}
          {errorMessage ? (
            <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-400/10 dark:text-red-300">
              {errorMessage}
            </p>
          ) : null}
          {!isLoading && !errorMessage && filteredNotices.length === 0 ? (
            <div className="mt-4 grid place-items-center rounded-xl bg-[var(--color-surface-muted)] px-4 py-12 text-center">
              <Megaphone className="text-brand" size={28} weight="regular" />
              <strong className="mt-3 text-base">
                {visibleStatus === "PUBLISHED" ? "게시 중인 공지가 없어요." : "임시 저장한 공지가 없어요."}
              </strong>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">새 공지를 작성해보세요.</p>
            </div>
          ) : null}
          <div className="mt-4 grid gap-2">
            {filteredNotices.map((notice) => (
              <article
                className="flex min-w-0 items-start gap-3 rounded-xl bg-[var(--color-surface-muted)] p-4"
                key={notice.id}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="min-w-0 truncate text-base font-semibold">{notice.title}</h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                        notice.status === "PUBLISHED"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300"
                          : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {notice.status === "PUBLISHED" ? "게시 중" : "임시 저장"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm leading-6 text-[var(--color-text-secondary)]">
                    {notice.body}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton
                    className="size-9"
                    label="공지 수정"
                    onClick={() => openEditEditor(notice)}
                    variant="ghost"
                  >
                    <NotePencil size={18} weight="regular" />
                  </IconButton>
                  <IconButton
                    className="size-9 text-red-500 hover:text-red-600"
                    label="공지 삭제"
                    onClick={() => void handleDelete(notice)}
                    variant="ghost"
                  >
                    <Trash size={18} weight="regular" />
                  </IconButton>
                </div>
              </article>
            ))}
          </div>
        </Card>
      </DesktopWorkspace>

      <ActionLayer
        desktop
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editingNotice ? "공지 수정" : "공지 작성"}
      >
        {editorForm}
      </ActionLayer>
    </>
  );
}

function StatusCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-muted)] p-3">
      <dt className="text-xs text-[var(--color-text-secondary)]">{label}</dt>
      <dd className="mt-1 text-xl font-semibold">{value}</dd>
    </div>
  );
}
