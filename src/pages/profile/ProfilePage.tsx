import { Check, PencilSimple, Plus, SignOut, Trash, UsersThree } from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { useConfirmDialog } from "../../components/common/confirmDialogContext";
import { DesktopWorkspace } from "../../components/layout/DesktopWorkspace";
import { Input } from "../../components/common/Input";
import { SegmentedControl } from "../../components/common/SegmentedControl";
import { useToast } from "../../components/common/toastContext";
import { updateUserProfile } from "../../features/auth/services/authService";
import { useAuth } from "../../features/auth/useAuth";
import {
  createFamily,
  deleteFamily,
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
  const [editingFamilyId, setEditingFamilyId] = useState("");
  const [editingFamilyName, setEditingFamilyName] = useState("");
  const [busyFamilyId, setBusyFamilyId] = useState("");
  const [activeTab, setActiveTab] = useState<"MY" | "GROUP">("MY");
  const [groupRoleTab, setGroupRoleTab] = useState<"OWNER" | "MEMBER">("OWNER");
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

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

  async function handleCreateFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    if (!newFamilyName.trim()) {
      notify("그룹 이름을 입력해주세요.", "info");
      return;
    }

    setIsCreating(true);

    try {
      const result = await createFamily({ name: newFamilyName, owner: user });
      await refreshFamilies(result.id);
      setNewFamilyName("");
      setIsCreatingFamily(false);
      notify("그룹을 생성했습니다.", "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setIsCreating(false);
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
      description: `${familyName} 그룹의 일정, 메모, 투표, 채팅을 더 이상 볼 수 없게 됩니다.`,
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

  const ownerFamilies = families.filter((family) => family.role === "OWNER" || family.ownerId === user?.uid);
  const memberFamilies = families.filter((family) => family.role !== "OWNER" && family.ownerId !== user?.uid);
  const visibleGroupRoleTab = groupRoleTab === "OWNER" && ownerFamilies.length === 0 && memberFamilies.length > 0
    ? "MEMBER"
    : groupRoleTab;
  const visibleFamilies = visibleGroupRoleTab === "OWNER" ? ownerFamilies : memberFamilies;

  return (
    <DesktopWorkspace
      sidebar={
        <Card className="grid gap-4">
          <div>
            <p className="text-xs font-semibold text-brand">내 정보</p>
            <h2 className="mt-1 text-xl font-semibold">프로필과 그룹 관리</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              내 정보와 참여 중인 그룹을 한곳에서 관리합니다.
            </p>
          </div>
          {activeFamily ? (
            <div className="rounded-2xl bg-[var(--color-surface-muted)] p-3">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)]">현재 그룹</p>
              <strong className="mt-1 block truncate">{activeFamily.name}</strong>
            </div>
          ) : null}
        </Card>
      }
    >
      <div className="grid gap-4">
        <SegmentedControl
          onChange={setActiveTab}
          options={[
            { label: "MY", value: "MY" },
            { label: "그룹", value: "GROUP" },
          ]}
          value={activeTab}
        />

        {activeTab === "MY" ? (
      <Card>
        <div className="flex items-center gap-4">
          {photoURL ? (
            <img
              alt={displayName || "사용자"}
              className="size-20 rounded-full object-cover ring-1 ring-inset ring-black/[0.04]"
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
      ) : (
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <UsersThree className="text-brand" size={22} weight="bold" />
              <h2 className="text-lg font-semibold">내 그룹</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              오너는 초대코드와 그룹을 관리하고, 그룹원은 참여 상태를 확인할 수 있습니다.
            </p>
          </div>
        </div>

        {isCreatingFamily ? (
          <form
            className="mt-4 grid gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-4"
            onSubmit={handleCreateFamily}
          >
            <Input
              label="그룹 이름"
              onChange={(event) => setNewFamilyName(event.target.value)}
              placeholder="새 그룹 이름을 입력해주세요"
              value={newFamilyName}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={isCreating} type="submit">
                <Check size={18} weight="bold" />
                생성하기
              </Button>
              <Button
                onClick={() => {
                  setIsCreatingFamily(false);
                  setNewFamilyName("");
                }}
                type="button"
                variant="secondary"
              >
                취소
              </Button>
            </div>
          </form>
        ) : null}

        <div className="mt-4">
          <SegmentedControl
            onChange={setGroupRoleTab}
            options={[
              { label: `오너 그룹 ${ownerFamilies.length}`, value: "OWNER" },
              { label: `그룹원 그룹 ${memberFamilies.length}`, value: "MEMBER" },
            ]}
            value={visibleGroupRoleTab}
          />
        </div>

        <div className="mt-4 grid gap-2">
          {isFamilyLoading ? (
            <p className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-secondary)]">
              그룹을 불러오는 중입니다.
            </p>
          ) : visibleFamilies.length > 0 ? (
            visibleFamilies.map((family) => {
              const isOwner = family.role === "OWNER" || family.ownerId === user?.uid;
              const isActive = activeFamily?.id === family.id;
              const isEditing = editingFamilyId === family.id;
              const isBusy = busyFamilyId === family.id;

              return (
                <div
                  className={`rounded-2xl border p-4 ${
                    isActive
                      ? "border-brand bg-brand-soft/40"
                      : isOwner
                        ? "border-brand/30 bg-brand-soft/20"
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
                        <span className="flex min-w-0 items-center gap-2">
                          <strong className="min-w-0 truncate text-base">{family.name}</strong>
                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                              isOwner
                                ? "bg-brand text-white"
                                : "bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
                            }`}
                          >
                            {isOwner ? "오너" : "그룹원"}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-xs text-[var(--color-text-secondary)]">
                          {isOwner
                            ? `초대 코드 ${family.inviteCode}`
                            : "초대코드는 그룹 오너가 관리해요."}
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
                            aria-label={`${family.name} 그룹 나가기`}
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
              {visibleGroupRoleTab === "OWNER"
                ? "내가 오너인 그룹이 없습니다."
                : "그룹원으로 참여 중인 그룹이 없습니다."}
            </p>
          )}
        </div>
        <Button
          className="mt-4 w-full"
          onClick={() => setIsCreatingFamily((current) => !current)}
          type="button"
          variant="secondary"
        >
          <Plus size={18} weight="bold" />
          그룹 생성
        </Button>
      </Card>
        )}
      </div>
    </DesktopWorkspace>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "처리 중 오류가 발생했습니다.";
}
