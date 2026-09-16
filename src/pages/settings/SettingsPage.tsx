import { Monitor, Moon, Sun, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { useConfirmDialog } from "../../components/common/confirmDialogContext";
import { DesktopWorkspace } from "../../components/layout/DesktopWorkspace";
import { useToast } from "../../components/common/toastContext";
import { deleteAccount, getAuthErrorMessage } from "../../features/auth/services/authService";
import { useAuth } from "../../features/auth/useAuth";
import { useFamily } from "../../features/family/useFamily";
import { useTheme } from "../../features/theme/useTheme";

export function SettingsPage() {
  const { user } = useAuth();
  const { families } = useFamily();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const { mode, resolvedTheme, setThemeMode } = useTheme();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteAccount() {
    if (!user) {
      return;
    }

    const confirmed = await confirm({
      confirmLabel: "회원탈퇴",
      description: "프로필과 크루 연결이 삭제되고 Firebase 계정에서 로그아웃됩니다. 이 작업은 되돌릴 수 없습니다.",
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
      showToast({ message: "회원탈퇴가 완료되었습니다.", variant: "success" });
    } catch (error) {
      showToast({ message: getAuthErrorMessage(error), variant: "error" });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <DesktopWorkspace
      sidebar={
        <Card>
          <p className="text-xs font-semibold text-brand">앱 설정</p>
          <h2 className="mt-1 text-xl font-semibold">설정</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
            화면 테마와 계정 보안 설정을 관리합니다.
          </p>
        </Card>
      }
    >
      <Card>
        <h2 className="text-2xl font-semibold">설정</h2>
        <div className="mt-5 grid gap-3">
          <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                {resolvedTheme === "dark" ? (
                  <Moon className="mt-0.5 shrink-0 text-brand" size={20} weight="bold" />
                ) : (
                  <Sun className="mt-0.5 shrink-0 text-brand" size={20} weight="bold" />
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
                <Monitor size={16} weight="bold" />
                기기 설정 따르기
              </button>
            ) : null}
          </div>
          <SettingRow label="프로필 이미지" value="Google photoURL 또는 직접 입력 URL 사용" />
          <SettingRow label="파일 업로드" value="MVP에서는 Firebase Storage 보류" />
          <SettingRow label="알림" value="브라우저 알림 기반 MVP" />
          <SettingRow label="호스팅" value="Firebase Hosting 자동배포 사용" />
        </div>
        <section className="mt-8 border-t border-[var(--color-border)] pt-6">
          <h3 className="text-lg font-semibold">회원탈퇴</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
            계정과 프로필, 크루 연결을 삭제합니다. 크루장인 경우 크루를 먼저 정리해야 합니다.
          </p>
          <Button
            className="mt-4 w-full"
            disabled={isDeleting}
            loading={isDeleting}
            onClick={() => void handleDeleteAccount()}
            type="button"
            variant="danger"
          >
            <Trash size={18} weight="bold" />
            회원탈퇴
          </Button>
        </section>
      </Card>
    </DesktopWorkspace>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
      <strong className="block text-sm">{label}</strong>
      <span className="mt-1 block text-sm text-[var(--color-text-secondary)]">
        {value}
      </span>
    </div>
  );
}
