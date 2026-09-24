import {
  Bell,
  CaretRight,
  FileText,
  Flag,
  MapPin,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  Trash,
  Wrench,
} from "@phosphor-icons/react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomSheet } from "../../components/common/BottomSheet";
import { ActionLayer } from "../../components/common/ActionLayer";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { useConfirmDialog } from "../../components/common/confirmDialogContext";
import { PolicyDocumentView } from "../../components/compliance/PolicyDocumentView";
import { DesktopWorkspace } from "../../components/layout/DesktopWorkspace";
import { useToast } from "../../components/common/toastContext";
import { deleteAccount, getAuthErrorMessage } from "../../features/auth/services/authService";
import { useAuth } from "../../features/auth/useAuth";
import { useFamily } from "../../features/family/useFamily";
import type { PolicyDocumentId } from "../../features/compliance/policyDocuments";
import { policyDocuments } from "../../features/compliance/policyDocuments";
import { useTheme } from "../../features/theme/useTheme";
import { buildInfo, getShortCommit } from "../../lib/app/buildInfo";
import { getFirebaseErrorMessage } from "../../lib/firebase/firebaseErrorMessage";
import { isPlatformAdmin } from "../../features/admin/platformAdmin";
import { ServiceNoticesView } from "../../components/compliance/ServiceNoticesView";
import { createModerationReport } from "../../features/moderation/services/moderationService";
import {
  moderationReasonLabels,
  moderationTargetLabels,
  type ModerationReportDraft,
  type ModerationReportReason,
  type ModerationTargetType,
} from "../../features/moderation/types/moderationTypes";

const emptyReportDraft: ModerationReportDraft = {
  details: "",
  reason: "HARASSMENT",
  targetLabel: "",
  targetType: "USER",
  targetUserId: null,
};

export function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activeFamily, families } = useFamily();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const { mode, resolvedTheme, setThemeMode } = useTheme();
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeDocument, setActiveDocument] = useState<PolicyDocumentId | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportDraft, setReportDraft] = useState<ModerationReportDraft>(emptyReportDraft);

  async function handleDeleteAccount() {
    if (!user) {
      return;
    }

    const confirmed = await confirm({
      confirmLabel: "회원탈퇴",
      description: "프로필과 크루 연결을 삭제하고 로그아웃해요. 되돌릴 수 없어요.",
      title: "회원탈퇴를 진행할까요?",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteAccount({
        ownedFamilyIds: families
          .filter((family) => family.ownerId === user.uid)
          .map((family) => family.id),
        user,
      });
      showToast({ message: "회원탈퇴를 완료했어요.", variant: "success" });
    } catch (error) {
      showToast({ message: getAuthErrorMessage(error), variant: "error" });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSubmitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !reportDraft.targetLabel.trim() || !reportDraft.details.trim()) {
      return;
    }

    setIsReporting(true);
    try {
      await createModerationReport({
        draft: reportDraft,
        familyId: activeFamily?.id ?? null,
        familyName: activeFamily?.name ?? null,
        reporterId: user.uid,
        reporterName: user.displayName ?? "사용자",
      });
      setReportDraft(emptyReportDraft);
      setIsReportOpen(false);
      showToast({ message: "신고를 접수했어요.", variant: "success" });
    } catch (error) {
      showToast({
        message: getFirebaseErrorMessage(error),
        variant: "error",
      });
    } finally {
      setIsReporting(false);
    }
  }

  return (
    <>
      <DesktopWorkspace
        sidebar={
          <Card>
            <p className="text-xs font-semibold text-brand">앱 설정</p>
            <h2 className="mt-1 text-xl font-semibold">설정</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              알림, 약관, 앱 정보와 계정 보안을 관리해요.
            </p>
          </Card>
        }
      >
        <Card>
          <h2 className="text-2xl font-semibold">설정</h2>
          <div className="mt-5 grid gap-6">
            <section className="grid gap-2">
              <h3 className="text-base font-semibold">화면</h3>
              <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    {resolvedTheme === "dark" ? (
                      <Moon className="mt-0.5 shrink-0 text-brand" size={20} weight="regular" />
                    ) : (
                      <Sun className="mt-0.5 shrink-0 text-brand" size={20} weight="regular" />
                    )}
                    <div className="min-w-0">
                      <strong className="block text-sm">다크모드</strong>
                      <span className="mt-1 block text-sm text-[var(--color-text-secondary)]">
                        {mode === "system"
                          ? "기기 설정에 따라 적용 중"
                          : resolvedTheme === "dark"
                            ? "직접 설정: 다크모드"
                            : "직접 설정: 라이트모드"}
                      </span>
                    </div>
                  </div>
                  <button
                    aria-checked={resolvedTheme === "dark"}
                    aria-label="다크모드 전환"
                    className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition ${
                      resolvedTheme === "dark" ? "bg-brand" : "bg-slate-300"
                    }`}
                    onClick={() => setThemeMode(resolvedTheme === "dark" ? "light" : "dark")}
                    role="switch"
                    type="button"
                  >
                    <span
                      className={`block size-5 rounded-full bg-white shadow-sm transition-transform ${
                        resolvedTheme === "dark" ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                {mode !== "system" ? (
                  <button
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand"
                    onClick={() => setThemeMode("system")}
                    type="button"
                  >
                    <Monitor size={16} weight="regular" />
                    기기 설정 따르기
                  </button>
                ) : null}
              </div>
            </section>

            <section className="grid gap-2">
              <h3 className="text-base font-semibold">서비스</h3>
              <SettingsActionRow
                description="서비스 변경과 새 소식을 확인해요."
                icon={<Bell size={20} weight="regular" />}
                label="공지사항"
                onClick={() => setActiveDocument("notices")}
              />
              <SettingsActionRow
                description="불편하거나 위험한 활동을 운영자에게 알려요."
                icon={<Flag size={20} weight="regular" />}
                label="신고하기"
                onClick={() => setIsReportOpen(true)}
              />
              {isPlatformAdmin(user?.uid) ? (
                <SettingsActionRow
                  description="공지 작성과 게시 상태를 관리해요."
                  icon={<Wrench size={20} weight="regular" />}
                  label="운영자 도구"
                  onClick={() => navigate("/admin")}
                />
              ) : null}
            </section>

            <section className="grid gap-2">
              <h3 className="text-base font-semibold">약관과 정책</h3>
              <SettingsActionRow
                description="서비스 이용에 필요한 기본 약속"
                icon={<FileText size={20} weight="regular" />}
                label={policyDocuments.terms.title}
                onClick={() => setActiveDocument("terms")}
              />
              <SettingsActionRow
                description="개인정보를 어떻게 사용하는지 안내해요."
                icon={<ShieldCheck size={20} weight="regular" />}
                label={policyDocuments.privacy.title}
                onClick={() => setActiveDocument("privacy")}
              />
              <SettingsActionRow
                description="위치 공유 범위와 중단 방법을 안내해요."
                icon={<MapPin size={20} weight="regular" />}
                label={policyDocuments.location.title}
                onClick={() => setActiveDocument("location")}
              />
            </section>

            <section className="grid gap-2">
              <h3 className="text-base font-semibold">앱 정보</h3>
              <div className="grid gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-4 text-sm">
                <InfoRow label="앱 버전" value={buildInfo.version} />
                <InfoRow label="배포 환경" value="Firebase Hosting" />
                <InfoRow label="빌드 커밋" value={getShortCommit(buildInfo.commit)} />
              </div>
            </section>

            <section className="grid gap-2 border-t border-[var(--color-border)] pt-6">
              <h3 className="text-lg font-semibold">계정</h3>
              <SettingRow label="프로필 이미지" value="Google photoURL 또는 직접 입력 URL 사용" />
              <SettingRow label="파일 업로드" value="MVP에서는 Firebase Storage 보류" />
              <SettingRow label="알림" value="브라우저 알림 기반 MVP" />
            </section>
          </div>

          <section className="mt-8 border-t border-[var(--color-border)] pt-6">
            <h3 className="text-lg font-semibold">회원탈퇴</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              계정과 프로필, 크루 연결을 삭제해요. 크루장인 경우 크루를 먼저 삭제해야 해요.
            </p>
            <Button
              className="mt-4 w-full"
              disabled={isDeleting}
              loading={isDeleting}
              onClick={() => void handleDeleteAccount()}
              type="button"
              variant="danger"
            >
              <Trash size={18} weight="regular" />
              회원탈퇴
            </Button>
          </section>
        </Card>
      </DesktopWorkspace>
      <BottomSheet
        isOpen={Boolean(activeDocument)}
        onClose={() => setActiveDocument(null)}
        title={activeDocument ? policyDocuments[activeDocument].title : "서비스 안내"}
      >
        {activeDocument === "notices" ? <ServiceNoticesView /> : null}
        {activeDocument && activeDocument !== "notices" ? (
          <PolicyDocumentView documentId={activeDocument} />
        ) : null}
      </BottomSheet>
      <ActionLayer
        desktop
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        title="신고하기"
      >
        <form className="mx-auto grid w-full max-w-2xl gap-4" onSubmit={handleSubmitReport}>
          <label className="grid gap-2 text-sm font-semibold">
            신고 대상
            <select
              className="h-12 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-base font-normal text-[var(--color-text-primary)] outline-none focus:border-brand focus:ring-4 focus:ring-emerald-100"
              onChange={(event) =>
                setReportDraft((current) => ({
                  ...current,
                  targetType: event.target.value as ModerationTargetType,
                }))
              }
              value={reportDraft.targetType}
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
                setReportDraft((current) => ({ ...current, targetLabel: event.target.value }))
              }
              placeholder="닉네임, 채팅방 또는 게시글을 적어주세요."
              required
              value={reportDraft.targetLabel}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            신고 사유
            <select
              className="h-12 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-base font-normal text-[var(--color-text-primary)] outline-none focus:border-brand focus:ring-4 focus:ring-emerald-100"
              onChange={(event) =>
                setReportDraft((current) => ({
                  ...current,
                  reason: event.target.value as ModerationReportReason,
                }))
              }
              value={reportDraft.reason}
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
                setReportDraft((current) => ({ ...current, details: event.target.value }))
              }
              placeholder="확인에 필요한 상황을 적어주세요."
              required
              value={reportDraft.details}
            />
            <span className="text-right text-xs font-normal text-[var(--color-text-secondary)]">
              {reportDraft.details.length}/1,000
            </span>
          </label>
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            신고 내용은 운영 확인에만 사용하며, 상대방에게 신고자 정보를 보여주지 않아요.
          </p>
          <Button
            disabled={
              isReporting || !reportDraft.targetLabel.trim() || !reportDraft.details.trim()
            }
            loading={isReporting}
            type="submit"
          >
            신고 접수
          </Button>
        </form>
      </ActionLayer>
    </>
  );
}

function SettingsActionRow({
  description,
  icon,
  label,
  onClick,
}: {
  description: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex min-w-0 items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-4 text-left transition-[background-color,transform] duration-200 hover:bg-brand-soft active:scale-[0.99]"
      onClick={onClick}
      type="button"
    >
      <span className="shrink-0 text-brand">{icon}</span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm">{label}</strong>
        <span className="mt-1 block truncate text-xs text-[var(--color-text-secondary)]">
          {description}
        </span>
      </span>
      <CaretRight className="shrink-0 text-[var(--color-text-secondary)]" size={18} weight="regular" />
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[var(--color-text-secondary)]">{label}</span>
      <strong className="min-w-0 truncate text-right font-semibold">{value}</strong>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
      <strong className="block text-sm">{label}</strong>
      <span className="mt-1 block text-sm text-[var(--color-text-secondary)]">{value}</span>
    </div>
  );
}
