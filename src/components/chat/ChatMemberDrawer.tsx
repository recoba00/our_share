import {
  ArrowLeft,
  Check,
  DotsThreeVertical,
  UserList,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "../common/Avatar";
import { BottomSheet } from "../common/BottomSheet";
import { BottomSheetItem } from "../common/BottomSheetItem";
import { Button } from "../common/Button";
import { FamilyRoleIndicator } from "../common/FamilyRoleIndicator";
import { IconButton } from "../common/IconButton";
import { useConfirmDialog } from "../common/confirmDialogContext";
import { useToast } from "../common/toastContext";
import {
  deleteFamilyMember,
  getFamilyMembers,
  transferFamilyOwnership,
  updateFamilyMemberRole,
} from "../../features/family/services/familyService";
import type { FamilyMemberProfile, FamilyRole } from "../../features/family/types/familyTypes";
import type { ChatRoom } from "../../features/chat/types/chatTypes";

const editableRoleOptions: Exclude<FamilyRole, "OWNER">[] = ["VICE_OWNER", "MEMBER"];
const roleLabels: Record<FamilyRole, string> = {
  CHILD: "자녀",
  MEMBER: "멤버",
  OWNER: "크루장",
  PARENT: "부모",
  VICE_OWNER: "부크루장",
};

type ChatMemberDrawerProps = {
  currentUserId: string;
  currentUserRole: FamilyRole;
  familyId: string;
  isOpen: boolean;
  onClose: () => void;
  room: ChatRoom | null;
};

export function ChatMemberDrawer({
  currentUserId,
  currentUserRole,
  familyId,
  isOpen,
  onClose,
  room,
}: ChatMemberDrawerProps) {
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const [members, setMembers] = useState<FamilyMemberProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMemberProfile | null>(null);
  const [memberManageView, setMemberManageView] = useState<"ACTIONS" | "ROLE">("ACTIONS");
  const [pendingRole, setPendingRole] = useState<Exclude<FamilyRole, "OWNER"> | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let active = true;
    getFamilyMembers(familyId)
      .then((nextMembers) => {
        if (active) {
          setMembers(nextMembers);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          showToast({
            message: error instanceof Error ? error.message : "멤버를 불러오지 못했어요.",
            variant: "error",
          });
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      document.body.style.overflow = previousOverflow;
    };
  }, [familyId, isOpen, showToast]);

  const visibleMembers = useMemo(() => {
    if (!room || room.type === "FAMILY" || room.memberIds.length === 0) {
      return members;
    }

    return members.filter((member) => room.memberIds.includes(member.userId));
  }, [members, room]);

  const canManageMembers = currentUserRole === "OWNER";

  function closeActions() {
    setSelectedMember(null);
    setMemberManageView("ACTIONS");
    setPendingRole(null);
  }

  function closeDrawer() {
    closeActions();
    onClose();
  }

  async function handleUpdateRole() {
    if (!selectedMember || !pendingRole) {
      return;
    }

    setIsBusy(true);
    try {
      await updateFamilyMemberRole({
        actorUserId: currentUserId,
        familyId,
        role: pendingRole,
        targetUserId: selectedMember.userId,
      });
      const nextMembers = await getFamilyMembers(familyId);
      setMembers(nextMembers);
      setSelectedMember(nextMembers.find((member) => member.userId === selectedMember.userId) ?? null);
      setMemberManageView("ACTIONS");
      setPendingRole(null);
      showToast({ message: "멤버 역할을 바꿨어요.", variant: "success" });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "역할을 바꾸지 못했어요.",
        variant: "error",
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleTransferOwnership() {
    if (!selectedMember) {
      return;
    }

    const confirmed = await confirm({
      confirmLabel: "승계하기",
      description: `${selectedMember.displayName ?? selectedMember.nickname}님이 새 크루장이 되고 나는 부크루장이 돼요.`,
      title: "크루장을 승계할까요?",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setIsBusy(true);
    try {
      await transferFamilyOwnership({
        actorUserId: currentUserId,
        familyId,
        targetUserId: selectedMember.userId,
      });
      await refreshMembers();
      showToast({ message: "크루장을 승계했어요.", variant: "success" });
      closeActions();
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "크루장을 승계하지 못했어요.",
        variant: "error",
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteMember() {
    if (!selectedMember) {
      return;
    }

    const confirmed = await confirm({
      confirmLabel: "내보내기",
      description: `${selectedMember.displayName ?? selectedMember.nickname}님을 이 크루에서 내보내요. 다시 참여하려면 초대 코드가 필요해요.`,
      title: "멤버를 내보낼까요?",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setIsBusy(true);
    try {
      await deleteFamilyMember({
        actorUserId: currentUserId,
        familyId,
        targetUserId: selectedMember.userId,
      });
      await refreshMembers();
      showToast({ message: "멤버를 크루에서 내보냈어요.", variant: "success" });
      closeActions();
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "멤버를 내보내지 못했어요.",
        variant: "error",
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function refreshMembers() {
    setMembers(await getFamilyMembers(familyId));
  }

  return (
    <>
      {isOpen
        ? createPortal(
            <>
              <button
                aria-label="참여 멤버 닫기"
                className="fixed inset-0 z-40 cursor-default bg-slate-950/20"
                onClick={closeDrawer}
                type="button"
              />
              <aside
                aria-label="참여 멤버"
                className="fixed right-0 top-0 z-50 flex h-dvh w-[280px] max-w-[calc(100vw-24px)] flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl side-panel-enter"
              >
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <UserList className="shrink-0 text-brand" size={20} weight="regular" />
                    <h2 className="truncate text-lg font-semibold">참여 멤버</h2>
                  </div>
                  <IconButton
                    className="size-8 rounded-none bg-transparent hover:bg-transparent"
                    label="참여 멤버 닫기"
                    onClick={closeDrawer}
                    variant="ghost"
                  >
                    <X size={20} weight="regular" />
                  </IconButton>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {isLoading ? (
                    <p className="px-2 py-4 text-sm text-[var(--color-text-secondary)]">멤버를 불러오는 중이에요.</p>
                  ) : visibleMembers.length === 0 ? (
                    <p className="px-2 py-4 text-sm text-[var(--color-text-secondary)]">참여 멤버가 없어요.</p>
                  ) : (
                    <div className="grid gap-1">
                      {visibleMembers.map((member) => (
                        <div className="flex min-w-0 items-center gap-2 rounded-xl px-2 py-2" key={member.userId}>
                          <Avatar
                            alt={member.displayName ?? member.nickname}
                            className="size-9 shrink-0"
                            src={member.photoURL}
                          />
                          <div className="min-w-0 flex-1">
                            <strong className="block truncate text-sm font-semibold">
                              {member.displayName ?? member.nickname}
                            </strong>
                            <div className="mt-0.5 flex items-center gap-1">
                              <FamilyRoleIndicator role={member.role} />
                            </div>
                          </div>
                          {canManageMembers && member.userId !== currentUserId && member.role !== "OWNER" ? (
                            <IconButton
                              className="size-8 shrink-0"
                              label={`${member.displayName ?? member.nickname} 멤버 관리`}
                              onClick={() => {
                                setSelectedMember(member);
                                setMemberManageView("ACTIONS");
                                setPendingRole(null);
                              }}
                              variant="ghost"
                            >
                              <DotsThreeVertical size={19} />
                            </IconButton>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            </>,
            document.body
          )
        : null}
      <BottomSheet
        isOpen={Boolean(selectedMember)}
        onClose={closeActions}
        title={memberManageView === "ROLE" ? "멤버 역할 변경" : selectedMember?.displayName ?? "멤버 관리"}
        titleAction={
          memberManageView === "ROLE" ? (
            <button
              aria-label="멤버 관리로 돌아가기"
              className="grid size-8 shrink-0 place-items-center text-[var(--color-text-secondary)] transition hover:text-brand"
              onClick={() => setMemberManageView("ACTIONS")}
              type="button"
            >
              <ArrowLeft size={20} />
            </button>
          ) : null
        }
      >
        {selectedMember && memberManageView === "ACTIONS" ? (
          <div className="grid gap-3">
            <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-3">
              <Avatar alt={selectedMember.displayName ?? selectedMember.nickname} src={selectedMember.photoURL} />
              <div className="min-w-0">
                <strong className="block truncate">{selectedMember.displayName ?? selectedMember.nickname}</strong>
                <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">
                  {roleLabels[selectedMember.role]}
                </span>
              </div>
            </div>
            <BottomSheetItem
              disabled={isBusy}
              onClick={() => {
                setPendingRole(selectedMember.role === "OWNER" ? "MEMBER" : selectedMember.role);
                setMemberManageView("ROLE");
              }}
              type="button"
            >
              <span>멤버 역할 변경</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{roleLabels[selectedMember.role]}</span>
            </BottomSheetItem>
            <BottomSheetItem disabled={isBusy} onClick={() => void handleTransferOwnership()} type="button">
              <span>크루장 승계</span>
              <FamilyRoleIndicator role="OWNER" />
            </BottomSheetItem>
            <BottomSheetItem disabled={isBusy} onClick={() => void handleDeleteMember()} tone="danger" type="button">
              <span>크루에서 내보내기</span>
              <DotsThreeVertical size={18} />
            </BottomSheetItem>
          </div>
        ) : null}
        {selectedMember && memberManageView === "ROLE" ? (
          <div className="grid gap-3">
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-3">
              <Avatar alt={selectedMember.displayName ?? selectedMember.nickname} src={selectedMember.photoURL} />
              <strong className="truncate">{selectedMember.displayName ?? selectedMember.nickname}</strong>
            </div>
            <div className="grid gap-2">
              {editableRoleOptions.map((role) => (
                <BottomSheetItem
                  active={pendingRole === role || selectedMember.role === role}
                  disabled={isBusy || selectedMember.role === role || (role === "VICE_OWNER" && members.filter((member) => member.role === "VICE_OWNER").length >= 2)}
                  key={role}
                  onClick={() => setPendingRole(role)}
                  type="button"
                >
                  <span>{roleLabels[role]}</span>
                  {pendingRole === role ? <Check className="text-brand" size={18} weight="bold" /> : null}
                </BottomSheetItem>
              ))}
            </div>
            <p className="text-xs leading-5 text-[var(--color-text-secondary)]">부크루장은 최대 2명까지 지정할 수 있어요.</p>
            <Button
              className="w-full"
              disabled={!pendingRole || pendingRole === selectedMember.role || isBusy}
              onClick={() => void handleUpdateRole()}
              type="button"
            >
              변경하기
            </Button>
          </div>
        ) : null}
      </BottomSheet>
    </>
  );
}
