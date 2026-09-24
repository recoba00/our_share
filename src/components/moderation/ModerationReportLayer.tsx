import { Flag } from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useState } from "react";
import { ActionLayer } from "../common/ActionLayer";
import { Button } from "../common/Button";
import { useToast } from "../common/toastContext";
import { useAuth } from "../../features/auth/useAuth";
import { useFamily } from "../../features/family/useFamily";
import { createModerationReport } from "../../features/moderation/services/moderationService";
import {
  moderationReasonLabels,
  moderationTargetLabels,
  type ModerationReportDraft,
  type ModerationReportReason,
  type ModerationTargetType,
} from "../../features/moderation/types/moderationTypes";
import type { ModerationReportTarget } from "../../features/moderation/utils/moderationReportTarget";
import { getFirebaseErrorMessage } from "../../lib/firebase/firebaseErrorMessage";

const emptyReportDraft: ModerationReportDraft = {
  details: "",
  reason: "HARASSMENT",
  targetLabel: "",
  targetType: "USER",
  targetUserId: null,
};

export function ModerationReportLayer({
  isOpen,
  onClose,
  target,
}: {
  isOpen: boolean;
  onClose: () => void;
  target?: ModerationReportTarget | null;
}) {
  return (
    <ActionLayer desktop isOpen={isOpen} onClose={onClose} title="신고하기">
      <ModerationReportForm onClose={onClose} target={target} />
    </ActionLayer>
  );
}

function ModerationReportForm({
  onClose,
  target,
}: {
  onClose: () => void;
  target?: ModerationReportTarget | null;
}) {
  const { user } = useAuth();
  const { activeFamily } = useFamily();
  const { showToast } = useToast();
  const targetLabel = target?.targetLabel ?? "";
  const targetType = target?.targetType ?? "USER";
  const targetUserId = target?.targetUserId ?? null;
  const hasPresetTarget = Boolean(target);
  const [draft, setDraft] = useState<ModerationReportDraft>(() => ({
      ...emptyReportDraft,
      targetLabel,
      targetType,
      targetUserId,
  }));
  const [isReporting, setIsReporting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !draft.targetLabel.trim() || !draft.details.trim()) {
      return;
    }

    setIsReporting(true);
    try {
      await createModerationReport({
        draft,
        familyId: activeFamily?.id ?? null,
        familyName: activeFamily?.name ?? null,
        reporterId: user.uid,
        reporterName: user.displayName ?? "사용자",
      });
      showToast({ message: "신고를 접수했어요.", variant: "success" });
      onClose();
    } catch (error) {
      showToast({ message: getFirebaseErrorMessage(error), variant: "error" });
    } finally {
      setIsReporting(false);
    }
  }

  return (
      <form className="mx-auto grid w-full max-w-2xl gap-4" onSubmit={handleSubmit}>
        {hasPresetTarget ? (
          <section className="flex min-w-0 items-start gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-4">
            <Flag className="mt-0.5 shrink-0 text-brand" size={20} weight="regular" />
            <div className="min-w-0">
              <span className="block text-xs font-normal text-[var(--color-text-secondary)]">
                {moderationTargetLabels[draft.targetType]}
              </span>
              <strong className="mt-1 block break-words text-sm font-semibold leading-5">
                {draft.targetLabel}
              </strong>
            </div>
          </section>
        ) : (
          <>
            <label className="grid gap-2 text-sm font-semibold">
              신고 대상
              <select
                className="h-12 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-base font-normal text-[var(--color-text-primary)] outline-none focus:border-brand focus:ring-4 focus:ring-emerald-100"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    targetType: event.target.value as ModerationTargetType,
                  }))
                }
                value={draft.targetType}
              >
                {Object.entries(moderationTargetLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              누구 또는 어떤 내용인가요?
              <input
                autoFocus
                className="h-12 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-base font-normal text-[var(--color-text-primary)] outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-emerald-100"
                inputMode="text"
                maxLength={120}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, targetLabel: event.target.value }))
                }
                placeholder="닉네임, 채팅방 또는 게시글을 적어주세요."
                required
                value={draft.targetLabel}
              />
            </label>
          </>
        )}
        <label className="grid gap-2 text-sm font-semibold">
          신고 사유
          <select
            autoFocus={hasPresetTarget}
            className="h-12 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-base font-normal text-[var(--color-text-primary)] outline-none focus:border-brand focus:ring-4 focus:ring-emerald-100"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                reason: event.target.value as ModerationReportReason,
              }))
            }
            value={draft.reason}
          >
            {Object.entries(moderationReasonLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          자세한 내용
          <textarea
            className="min-h-48 resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base font-normal leading-6 text-[var(--color-text-primary)] outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-emerald-100"
            inputMode="text"
            maxLength={1000}
            onChange={(event) =>
              setDraft((current) => ({ ...current, details: event.target.value }))
            }
            placeholder="확인에 필요한 상황을 적어주세요."
            required
            value={draft.details}
          />
          <span className="text-right text-xs font-normal text-[var(--color-text-secondary)]">
            {draft.details.length}/1,000
          </span>
        </label>
        <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
          신고 내용은 운영 확인에만 사용하며, 상대방에게 신고자 정보를 보여주지 않아요.
        </p>
        <Button
          disabled={isReporting || !draft.targetLabel.trim() || !draft.details.trim()}
          loading={isReporting}
          type="submit"
        >
          신고 접수
        </Button>
      </form>
  );
}
