import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { useToast } from "../../components/common/toastContext";
import { updateUserProfile } from "../../features/auth/services/authService";
import { useAuth } from "../../features/auth/useAuth";

export function ProfilePage() {
  const { refreshUser, signOut, user } = useAuth();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState(() => user?.displayName ?? "");
  const [photoURL, setPhotoURL] = useState(() => user?.photoURL ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setIsSaving(true);

    try {
      await updateUserProfile({
        displayName,
        photoURL,
        user,
      });
      await user.reload();
      refreshUser();
      notify("내 정보를 저장했습니다.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "내 정보 저장에 실패했습니다.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  function notify(message: string, variant: "error" | "info" | "success") {
    showToast({ message, variant });
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <Card>
        <div className="flex items-center gap-4">
          {photoURL ? (
            <img
              alt={displayName || "사용자"}
              className="size-20 rounded-full border border-[var(--color-border)] object-cover"
              src={photoURL}
            />
          ) : (
            <div className="grid size-20 place-items-center rounded-full bg-brand-soft text-2xl font-semibold text-brand">
              {(displayName || user?.email || "?").slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              내 정보
            </p>
            <h2 className="truncate text-2xl font-semibold">
              {displayName || "그룹 구성원"}
            </h2>
            <p className="mt-1 truncate text-sm text-[var(--color-text-secondary)]">
              {user?.email ?? "이메일 없음"}
            </p>
          </div>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleSave}>
          <Input
            label="닉네임"
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="그룹에 표시될 이름"
            value={displayName}
          />
          <Input
            label="프로필 이미지 URL"
            onChange={(event) => setPhotoURL(event.target.value)}
            placeholder="https://..."
            value={photoURL}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <Button disabled={isSaving} type="submit">
              저장
            </Button>
            <Button onClick={() => void signOut()} type="button" variant="secondary">
              로그아웃
            </Button>
          </div>
        </form>

      </Card>
    </div>
  );
}
