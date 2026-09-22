import { Check, PencilSimple, Plus, SignOut, Trash, UsersThree } from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { FamilyRoleIndicator } from "../../components/common/FamilyRoleIndicator";
import { useConfirmDialog } from "../../components/common/confirmDialogContext";
import { DesktopWorkspace } from "../../components/layout/DesktopWorkspace";
import { Input } from "../../components/common/Input";
import { SegmentedControl } from "../../components/common/SegmentedControl";
import { useToast } from "../../components/common/toastContext";
import { CreateFamilySheet } from "../../components/common/CreateFamilySheet";
import { updateUserProfile } from "../../features/auth/services/authService";
import { useAuth } from "../../features/auth/useAuth";
import {
  limitFamilyNameInput,
  MAX_FAMILY_NAME_LENGTH,
  truncateFamilyName,
} from "../../features/family/utils/familyName";
import {
  deleteFamily,
  leaveFamily,
  updateFamily,
} from "../../features/family/services/familyService";
import { useFamily } from "../../features/family/useFamily";

export function ProfilePage() {
  const [searchParams] = useSearchParams();
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
  const groupTabRequested = searchParams.get("tab") === "group";
  const groupTabsRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"MY" | "GROUP">(
    groupTabRequested ? "GROUP" : "MY"
  );
  const [groupRoleTab, setGroupRoleTab] = useState<"OWNER" | "MEMBER">("OWNER");
  const [isCreateFamilyOpen, setIsCreateFamilyOpen] = useState(false);

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
      notify("내 정보를 저장했어요.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "내 정보를 저장하지 못했어요.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      notify("로그아웃했어요.", "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    }
  }

  async function handleRenameFamily(familyId: string) {
    if (!editingFamilyName.trim()) {
      notify("크루 이름을 적어주세요.", "info");
      return;
    }

    setBusyFamilyId(familyId);

    try {
      await updateFamily({ familyId, name: editingFamilyName });
      await refreshFamilies(familyId);
      setEditingFamilyId("");
      setEditingFamilyName("");
      notify("크루 이름을 바꿨어요.", "success");
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
      confirmLabel: "크루 삭제",
      description: `${familyName} 크루와 멤버 연결을 삭제해요. 일정·메모·투표·채팅은 복구할 수 없어요.`,
      title: `'${familyName}' 크루를 삭제할까요?`,
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setBusyFamilyId(familyId);

    try {
      await deleteFamily({ familyId, ownerId: user.uid });
      await refreshFamilies();
      notify("크루를 삭제했어요.", "success");
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
      confirmLabel: "크루 나가기",
      description: `${familyName} 크루의 일정·메모·투표·채팅을 더 이상 볼 수 없어요.`,
      title: `'${familyName}' 크루에서 나갈까요?`,
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setBusyFamilyId(familyId);

    try {
      await leaveFamily({ familyId, userId: user.uid });
      await refreshFamilies();
      notify("크루에서 나갔어요.", "success");
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

  useEffect(() => {
    if (!groupTabRequested) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      groupTabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      groupTabsRef.current
        ?.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')
        ?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [groupTabRequested]);

  return (
    <>
    <DesktopWorkspace
      sidebar={
        <Card className="grid gap-4">
          <div>
            <p className="text-xs font-semibold text-brand">내 정보</p>
            <h2 className="mt-1 text-xl font-semibold">프로필과 크루 관리</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              내 정보와 참여 중인 크루를 한곳에서 관리합니다.
            </p>
          </div>
          {activeFamily ? (
            <div className="rounded-2xl bg-[var(--color-surface-muted)] p-3">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)]">현재 크루</p>
              <strong className="mt-1 block min-w-0 truncate">{truncateFamilyName(activeFamily.name)}</strong>
            </div>
          ) : null}
        </Card>
      }
    >
      <div className="grid gap-4">
        <div className="scroll-mt-20" ref={groupTabsRef}>
          <SegmentedControl
            onChange={setActiveTab}
            options={[
              { label: "MY", value: "MY" },
              { label: "크루", value: "GROUP" },
            ]}
            value={activeTab}
          />
        </div>

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
            <h2 className="truncate text-2xl font-semibold">{displayName || "크루 멤버"}</h2>
            <p className="mt-1 truncate text-sm text-[var(--color-text-secondary)]">
              {user?.email ?? "이메일 없음"}
            </p>
          </div>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleSave}>
          <Input
            label="닉네임"
            onChange={(event) => setDisplayName(event.target.value)}
              placeholder="크루에 표시될 이름"
            value={displayName}
          />
          <Input
            label="프로필 이미지 URL"
            onChange={(event) => setPhotoURL(event.target.value)}
            placeholder="https://..."
            value={photoURL}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <Button disabled={isSaving} loading={isSaving} type="submit">
              저장
            </Button>
            <Button onClick={() => void handleSignOut()} type="button" variant="secondary">
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
              <h2 className="text-lg font-semibold">내 크루</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              내 크루의 초대코드와 멤버를 관리하고, 참여 중인 크루를 확인할 수 있어요.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <SegmentedControl
            onChange={setGroupRoleTab}
            options={[
              { label: `내 크루 ${ownerFamilies.length}`, value: "OWNER" },
              { label: `참여 크루 ${memberFamilies.length}`, value: "MEMBER" },
            ]}
            value={visibleGroupRoleTab}
          />
        </div>

        <div className="mt-4 grid gap-2">
          {isFamilyLoading ? (
            <p className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-secondary)]">
              크루를 불러오는 중이에요.
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
                        label="크루 이름"
                        maxLength={MAX_FAMILY_NAME_LENGTH}
                        onChange={(event) => setEditingFamilyName(limitFamilyNameInput(event.target.value))}
                        value={editingFamilyName}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button disabled={isBusy} loading={isBusy} onClick={() => void handleRenameFamily(family.id)}>
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
                        className="min-w-0 flex-1 basis-0 text-left"
                        onClick={() => selectFamily(family.id)}
                        type="button"
                      >
                        <span className="flex w-full min-w-0 items-center gap-2">
                          <FamilyRoleIndicator role={family.role} />
                          <strong className="min-w-0 flex-1 truncate text-base">
                            {truncateFamilyName(family.name)}
                          </strong>
                        </span>
                        <span className="mt-1 block truncate text-xs text-[var(--color-text-secondary)]">
                          {isOwner || family.role === "VICE_OWNER"
                            ? isOwner
                              ? `초대 코드 ${family.inviteCode}`
                              : "초대 링크를 공유할 수 있어요."
                            : "초대코드는 크루장이 관리해요."}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        {isActive ? (
                            <span className="mr-1 shrink-0 whitespace-nowrap rounded-full bg-brand px-2 py-1 text-[11px] font-semibold text-white">
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
                            aria-label={`${family.name} 크루 나가기`}
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
                ? "만든 크루가 없어요."
                : "참여 중인 크루가 없어요."}
            </p>
          )}
        </div>
        <Button
          className="mt-4 w-full"
          onClick={() => setIsCreateFamilyOpen(true)}
          type="button"
          variant="secondary"
        >
          <Plus size={18} weight="bold" />
          크루 생성하기
        </Button>
      </Card>
        )}
      </div>
    </DesktopWorkspace>
    <CreateFamilySheet
      isOpen={isCreateFamilyOpen}
      onClose={() => setIsCreateFamilyOpen(false)}
    />
    </>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "잠시 문제가 생겼어요. 다시 시도해주세요.";
}
