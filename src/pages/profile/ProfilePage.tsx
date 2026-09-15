import { Check, LinkSimple, PencilSimple, Plus, SignOut, Trash, UsersThree } from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { useConfirmDialog } from "../../components/common/confirmDialogContext";
import { Input } from "../../components/common/Input";
import { useToast } from "../../components/common/toastContext";
import { updateUserProfile } from "../../features/auth/services/authService";
import { useAuth } from "../../features/auth/useAuth";
import {
  createFamily,
  deleteFamily,
  joinFamilyByInviteCode,
  leaveFamily,
  updateFamily,
} from "../../features/family/services/familyService";
import { useFamily } from "../../features/family/useFamily";

export function ProfilePage() {
  const { refreshUser, signOut, user } = useAuth();
  const { activeFamily, families, isLoading: isFamilyLoading, refreshFamilies, selectFamily } = useFamily();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState(() => user?.displayName ?? "");
  const [photoURL, setPhotoURL] = useState(() => user?.photoURL ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [familyInviteCode, setFamilyInviteCode] = useState("");
  const [editingFamilyId, setEditingFamilyId] = useState("");
  const [editingFamilyName, setEditingFamilyName] = useState("");
  const [busyFamilyId, setBusyFamilyId] = useState("");

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setIsSaving(true);

    try {
      await updateUserProfile({ displayName, photoURL, user });
      await user.reload();
      refreshUser();
      notify("내 정보를 저장했습니다.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "내 정보 저장에 실패했습니다.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateFamily() {
    if (!user || !newFamilyName.trim()) {
      notify("그룹 이름을 입력해주세요.", "info");
      return;
    }

    setBusyFamilyId("new");

    try {
      const result = await createFamily({ name: newFamilyName.trim(), owner: user });
      await refreshFamilies(result.id);
      setNewFamilyName("");
      notify(`그룹을 만들었습니다. 초대 코드: ${result.inviteCode}`, "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setBusyFamilyId("");
    }
  }

  async function handleJoinFamily() {
    if (!user || !familyInviteCode.trim()) {
      notify("초대 코드를 입력해주세요.", "info");
      return;
    }

    setBusyFamilyId("join");

    try {
      const result = await joinFamilyByInviteCode({ inviteCode: familyInviteCode, user });
      await refreshFamilies(result.id);
      setFamilyInviteCode("");
      notify(`${result.name} 그룹에 참여했습니다.`, "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setBusyFamilyId("");
    }
  }

  async function handleRenameFamily(familyId: string) {
    if (!editingFamilyName.trim()) {
      notify("그룹 이름을 입력해주세요.", "info");
      return;
    }

    setBusyFamilyId(familyId);

    try {
      await updateFamily({ familyId, name: editingFamilyName });
      await refreshFamilies(familyId);
      setEditingFamilyId("");
      setEditingFamilyName("");
      notify("그룹 이름을 수정했습니다.", "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setBusyFamilyId("");
    }
  }

  async function handleDeleteFamily(familyId: string, familyName: string) {
    if (!user) {
      return;
    }

    const confirmed = await confirm({
      confirmLabel: "그룹 삭제",
      description: `${familyName} 그룹의 구성원 연결을 삭제합니다. 일정, 메모, 투표, 채팅 데이터는 복구할 수 없습니다.`,
      title: `'${familyName}' 그룹을 삭제할까요?`,
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setBusyFamilyId(familyId);

    try {
      await deleteFamily({ familyId, ownerId: user.uid });
      await refreshFamilies();
      notify("그룹을 삭제했습니다.", "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setBusyFamilyId("");
    }
  }

  async function handleLeaveFamily(familyId: string, familyName: string) {
    if (!user) {
      return;
    }

    const confirmed = await confirm({
      confirmLabel: "그룹 나가기",
      description: `${familyName} 그룹에서 나가면 다시 초대 코드가 필요합니다.`,
      title: `'${familyName}' 그룹에서 나갈까요?`,
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setBusyFamilyId(familyId);

    try {
      await leaveFamily({ familyId, userId: user.uid });
      await refreshFamilies();
      notify("그룹에서 나갔습니다.", "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setBusyFamilyId("");
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
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">내 정보</p>
            <h2 className="truncate text-2xl font-semibold">{displayName || "그룹 구성원"}</h2>
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
              <SignOut size={18} weight="bold" />
              로그아웃
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <UsersThree className="text-brand" size={22} weight="bold" />
              <h2 className="text-lg font-semibold">내 그룹</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              그룹을 선택하거나 생성·수정·삭제할 수 있습니다.
            </p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-[var(--color-text-secondary)]">
            {families.length}개
          </span>
        </div>

        <div className="mt-4 grid gap-2">
          {isFamilyLoading ? (
            <p className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-secondary)]">
              그룹을 불러오는 중입니다.
            </p>
          ) : families.length > 0 ? (
            families.map((family) => {
              const isOwner = family.ownerId === user?.uid;
              const isActive = activeFamily?.id === family.id;
              const isEditing = editingFamilyId === family.id;
              const isBusy = busyFamilyId === family.id;

              return (
                <div
                  className={`rounded-2xl border p-4 ${
                    isActive
                      ? "border-brand bg-brand-soft/40"
                      : "border-[var(--color-border)] bg-[var(--color-surface-muted)]"
                  }`}
                  key={family.id}
                >
                  {isEditing ? (
                    <div className="grid gap-3">
                      <Input
                        label="그룹 이름"
                        onChange={(event) => setEditingFamilyName(event.target.value)}
                        value={editingFamilyName}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button disabled={isBusy} onClick={() => void handleRenameFamily(family.id)}>
                          <Check size={18} weight="bold" />
                          저장
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingFamilyId("");
                            setEditingFamilyName("");
                          }}
                          variant="secondary"
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-w-0 items-start gap-3">
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => selectFamily(family.id)}
                        type="button"
                      >
                        <strong className="block truncate text-base">{family.name}</strong>
                        <span className="mt-1 block truncate text-xs text-[var(--color-text-secondary)]">
                          초대 코드 {family.inviteCode}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        {isActive ? (
                          <span className="mr-1 rounded-full bg-brand px-2 py-1 text-[11px] font-semibold text-white">
                            사용중
                          </span>
                        ) : null}
                        {isOwner ? (
                          <>
                            <button
                              aria-label={`${family.name} 이름 수정`}
                              className="grid size-8 place-items-center text-[var(--color-text-secondary)] transition hover:text-brand"
                              onClick={() => {
                                setEditingFamilyId(family.id);
                                setEditingFamilyName(family.name);
                              }}
                              type="button"
                            >
                              <PencilSimple size={17} />
                            </button>
                            <button
                              aria-label={`${family.name} 삭제`}
                              className="grid size-8 place-items-center text-[var(--color-text-secondary)] transition hover:text-red-600 disabled:opacity-50"
                              disabled={isBusy}
                              onClick={() => void handleDeleteFamily(family.id, family.name)}
                              type="button"
                            >
                              <Trash size={17} />
                            </button>
                          </>
                        ) : (
                          <button
                            aria-label={`${family.name} 나가기`}
                            className="grid size-8 place-items-center text-[var(--color-text-secondary)] transition hover:text-red-600 disabled:opacity-50"
                            disabled={isBusy}
                            onClick={() => void handleLeaveFamily(family.id, family.name)}
                            type="button"
                          >
                            <SignOut size={17} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-secondary)]">
              아직 참여한 그룹이 없습니다. 아래에서 새 그룹을 만들거나 초대 코드로 참여하세요.
            </p>
          )}
        </div>

        <div className="mt-5 grid gap-4 border-t border-[var(--color-border)] pt-5">
          <div>
            <h3 className="text-base font-semibold">새 그룹 만들기</h3>
            <div className="mt-2 flex gap-2">
              <Input
                label="그룹 이름"
                onChange={(event) => setNewFamilyName(event.target.value)}
                placeholder="예: 우리 그룹"
                value={newFamilyName}
              />
              <Button
                className="mt-7 shrink-0"
                disabled={busyFamilyId === "new"}
                onClick={() => void handleCreateFamily()}
              >
                <Plus size={18} weight="bold" />
                생성
              </Button>
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold">초대 코드로 참여</h3>
            <div className="mt-2 flex gap-2">
              <Input
                label="초대 코드"
                onChange={(event) => setFamilyInviteCode(event.target.value.toUpperCase())}
                placeholder="예: A1B2C3"
                value={familyInviteCode}
              />
              <Button
                className="mt-7 shrink-0"
                disabled={busyFamilyId === "join"}
                onClick={() => void handleJoinFamily()}
                variant="secondary"
              >
                <LinkSimple size={18} weight="bold" />
                참여
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "처리 중 오류가 발생했습니다.";
}
