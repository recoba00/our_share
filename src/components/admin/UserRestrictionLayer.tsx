import { ShieldWarning } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { ActionLayer } from "../common/ActionLayer";
import { Button } from "../common/Button";
import { useConfirmDialog } from "../common/confirmDialogContext";
import { useToast } from "../common/toastContext";
import type { AdminPublicProfile } from "../../features/admin/types/adminDashboardTypes";
import { useAuth } from "../../features/auth/useAuth";
import {
  restoreUserAccess,
  restrictUser,
} from "../../features/moderation/services/moderationService";
import {
  restrictionReasonLabels,
  type UserRestriction,
  type UserRestrictionReason,
} from "../../features/moderation/types/moderationTypes";
import { getFirebaseErrorMessage } from "../../lib/firebase/firebaseErrorMessage";

export function UserRestrictionLayer({
  onClose,
  onChanged,
  profile,
  restriction,
}: {
  onClose: () => void;
  onChanged: () => void;
  profile: AdminPublicProfile | null;
  restriction: UserRestriction | null;
}) {
  const { user } = useAuth();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const [reason, setReason] = useState<UserRestrictionReason>("ABUSE");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleRestrict(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !profile) {
      return;
    }

    setIsSaving(true);
    try {
      await restrictUser({ createdBy: user.uid, note, reason, userId: profile.id });
      showToast({ message: "사용자 이용을 제한했어요.", variant: "success" });
      onChanged();
      onClose();
    } catch (error) {
      showToast({ message: getFirebaseErrorMessage(error), variant: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRestore() {
    if (!profile) {
      return;
    }

    const confirmed = await confirm({
      confirmLabel: "제한 해제",
      description: `${profile.displayName ?? "사용자"}님이 서비스를 다시 이용할 수 있어요.`,
      title: "이용 제한을 해제할까요?",
    });
    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    try {
      await restoreUserAccess(profile.id);
      showToast({ message: "이용 제한을 해제했어요.", variant: "success" });
      onChanged();
      onClose();
    } catch (error) {
      showToast({ message: getFirebaseErrorMessage(error), variant: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ActionLayer
      desktop
      isOpen={Boolean(profile)}
      onClose={onClose}
      title={restriction ? "이용 제한 관리" : "사용자 이용 제한"}
    >
      <div className="mx-auto grid w-full max-w-2xl gap-5">
        <div className="flex items-center gap-3 rounded-lg bg-[var(--color-surface-muted)] p-4">
          <ShieldWarning className="shrink-0 text-brand" size={24} weight="regular" />
          <div className="min-w-0">
            <strong className="block truncate text-base">{profile?.displayName ?? "사용자"}</strong>
            <span className="mt-1 block truncate text-xs text-[var(--color-text-secondary)]">
              {profile?.id}
            </span>
          </div>
        </div>

        {restriction ? (
          <>
            <dl className="grid gap-3 rounded-lg bg-[var(--color-surface-muted)] p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-text-secondary)]">제한 사유</dt>
                <dd className="font-semibold">{restrictionReasonLabels[restriction.reason]}</dd>
              </div>
              {restriction.note ? (
                <div className="grid gap-1">
                  <dt className="text-[var(--color-text-secondary)]">안내</dt>
                  <dd className="whitespace-pre-line leading-6">{restriction.note}</dd>
                </div>
              ) : null}
            </dl>
            <Button
              disabled={isSaving}
              loading={isSaving}
              onClick={() => void handleRestore()}
              type="button"
              variant="secondary"
            >
              제한 해제
            </Button>
          </>
        ) : (
          <form className="grid gap-4" onSubmit={handleRestrict}>
            <label className="grid gap-2 text-sm font-semibold">
              제한 사유
              <select
                className="h-12 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-base font-normal text-[var(--color-text-primary)] outline-none focus:border-brand focus:ring-4 focus:ring-emerald-100"
                onChange={(event) => setReason(event.target.value as UserRestrictionReason)}
                value={reason}
              >
                {Object.entries(restrictionReasonLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              사용자 안내
              <textarea
                autoFocus
                className="min-h-44 resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base font-normal leading-6 text-[var(--color-text-primary)] outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-emerald-100"
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
                placeholder="제한 화면에 보여줄 안내를 적어주세요."
                value={note}
              />
            </label>
            <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
              제한 즉시 앱 데이터와 실시간 위치 접근이 차단돼요.
            </p>
            <Button disabled={isSaving} loading={isSaving} type="submit" variant="danger">
              이용 제한
            </Button>
          </form>
        )}
      </div>
    </ActionLayer>
  );
}
