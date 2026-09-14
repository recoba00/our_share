import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { updateUserProfile } from "../../features/auth/services/authService";
import { useAuth } from "../../features/auth/useAuth";

export function ProfilePage() {
  const { refreshUser, signOut, user } = useAuth();
  const [displayName, setDisplayName] = useState(() => user?.displayName ?? "");
  const [photoURL, setPhotoURL] = useState(() => user?.photoURL ?? "");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      await updateUserProfile({
        displayName,
        photoURL,
        user,
      });
      await user.reload();
      refreshUser();
      setStatusMessage("내 정보를 저장했습니다.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "내 정보 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
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
            <div className="grid size-20 place-items-center rounded-full bg-brand-soft text-2xl font-black text-brand">
              {(displayName || user?.email || "?").slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              내 정보
            </p>
            <h2 className="truncate text-2xl font-black">
              {displayName || "가족 구성원"}
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
            placeholder="가족에게 표시될 이름"
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

        {statusMessage ? (
          <p className="mt-4 rounded-xl bg-brand-soft p-3 text-sm font-semibold text-emerald-900">
            {statusMessage}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
