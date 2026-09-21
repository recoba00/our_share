import {
  ArrowLeft,
  ArrowCounterClockwise,
  CalendarDots,
  Check,
  ChatCircleDots,
  CopySimple,
  DotsThreeVertical,
  LinkSimple,
  MapPin,
  Note,
  ShareNetwork,
  SignOut,
  Trash,
  GearSix,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "../../components/common/Avatar";
import { AnimatedCheckbox } from "../../components/common/AnimatedCheckbox";
import { BottomSheet } from "../../components/common/BottomSheet";
import { BottomSheetItem } from "../../components/common/BottomSheetItem";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { SignInConsentButton } from "../../components/compliance/SignInConsentButton";
import { PolicyDocumentView } from "../../components/compliance/PolicyDocumentView";
import { FamilyRoleIndicator } from "../../components/common/FamilyRoleIndicator";
import { useConfirmDialog } from "../../components/common/confirmDialogContext";
import { IconButton } from "../../components/common/IconButton";
import { Input } from "../../components/common/Input";
import { useToast } from "../../components/common/toastContext";
import { DesktopWorkspace } from "../../components/layout/DesktopWorkspace";
import { useAuth } from "../../features/auth/useAuth";
import {
  hasLocationShareConsent,
  saveLocationShareConsent,
} from "../../features/compliance/consentStorage";
import { policyDocuments } from "../../features/compliance/policyDocuments";
import {
  deleteFamilyMember,
  getFamilyMembers,
  joinFamilyByInviteCode,
  leaveFamily,
  transferFamilyOwnership,
  updateFamilyMemberRole,
} from "../../features/family/services/familyService";
import { useFamily } from "../../features/family/useFamily";
import { truncateFamilyName } from "../../features/family/utils/familyName";
import type {
  FamilyMemberProfile,
  FamilyRole,
} from "../../features/family/types/familyTypes";
import { subscribeCalendarEvents } from "../../features/calendar/services/calendarService";
import type { CalendarEvent } from "../../features/calendar/types/calendarTypes";
import {
  getDDayLabel,
  getThisMonthEvents,
} from "../../features/calendar/utils/calendarEventUtils";
import {
  getOrCreateFamilyRoom,
  sendTextMessage,
  subscribeChatRooms,
} from "../../features/chat/services/chatService";
import type { ChatRoom } from "../../features/chat/types/chatTypes";
import { subscribeFamilyLocations } from "../../features/location/services/locationService";
import type { LiveLocation } from "../../features/location/types/locationTypes";
import { subscribeMemos } from "../../features/memo/services/memoService";
import type { Memo } from "../../features/memo/types/memoTypes";
import {
  getNotificationPermission,
  notifyDashboardReminders,
} from "../../features/notification/services/notificationService";
import { subscribePolls } from "../../features/poll/services/pollService";
import type { Poll } from "../../features/poll/types/pollTypes";

const quickMessages = ["어디야?", "언제 와?", "오는 길에 마트 들러줘!"];
const editableRoleOptions: Exclude<FamilyRole, "OWNER">[] = ["VICE_OWNER", "MEMBER"];
const roleLabels: Record<FamilyRole, string> = {
  CHILD: "자녀",
  MEMBER: "멤버",
  OWNER: "크루장",
  PARENT: "부모",
  VICE_OWNER: "부크루장",
};
const memberRoleOrder: Record<FamilyRole, number> = {
  OWNER: 0,
  VICE_OWNER: 1,
  PARENT: 2,
  MEMBER: 3,
  CHILD: 4,
};
const kakaoMapJavaScriptKey =
  import.meta.env.VITE_KAKAO_MAP_JAVASCRIPT_KEY ||
  "3e1f4432739a5ee8beee56c08369ab72";
let kakaoMapScriptPromise: Promise<void> | null = null;

type KakaoMap = {
  getProjection: () => {
    containerPointFromCoords: (latLng: unknown) => { x: number; y: number };
  };
  relayout: () => void;
  setBounds: (
    bounds: { extend: (latLng: unknown) => void },
    top?: number,
    right?: number,
    bottom?: number,
    left?: number
  ) => void;
  setCenter: (latLng: unknown) => void;
  setDraggable: (draggable: boolean) => void;
  setLevel: (level: number, options?: { animate?: boolean }) => void;
  setZoomable: (zoomable: boolean) => void;
};

type KakaoMaps = {
  event: {
    addListener: (target: unknown, type: string, handler: () => void) => void;
  };
  LatLng: new (latitude: number, longitude: number) => unknown;
  LatLngBounds: new () => { extend: (latLng: unknown) => void };
  load: (callback: () => void) => void;
  Map: new (
    container: HTMLElement,
    options: { center: unknown; level: number }
  ) => KakaoMap;
  services: {
    Geocoder: new () => KakaoGeocoder;
    Status: {
      OK: string;
    };
  };
};
type KakaoGeocoder = {
  coord2Address: (
    longitude: number,
    latitude: number,
    callback: (result: KakaoAddressResult[], status: string) => void
  ) => void;
};
type KakaoAddressResult = {
  address?: { address_name?: string };
  road_address?: { address_name?: string };
};
type MapPinPosition = {
  unit: "px" | "%";
  x: number;
  y: number;
};

declare global {
  interface Window {
    kakao?: {
      maps: KakaoMaps;
    };
  }
}

export function HomePage() {
  const { authError, status, user } = useAuth();
  const { activeFamily, locationShare, refreshFamilies } = useFamily();
  const {
    clearMessage: clearLocationMessage,
    message: locationShareMessage,
    status: locationShareStatus,
  } = locationShare;
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const [members, setMembers] = useState<FamilyMemberProfile[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [sendingQuickMessageTo, setSendingQuickMessageTo] = useState("");
  const [updatingMemberRoleId, setUpdatingMemberRoleId] = useState("");
  const [transferringOwnerId, setTransferringOwnerId] = useState("");
  const [deletingMemberId, setDeletingMemberId] = useState("");
  const [liveLocations, setLiveLocations] = useState<Record<string, LiveLocation>>({});
  const [locationAddresses, setLocationAddresses] = useState<Record<string, string>>({});
  const [selectedLocationMemberId, setSelectedLocationMemberId] = useState("");
  const [selectedManageMemberId, setSelectedManageMemberId] = useState("");
  const [memberManageView, setMemberManageView] = useState<"ACTIONS" | "ROLE">("ACTIONS");
  const [pendingMemberRole, setPendingMemberRole] = useState<Exclude<FamilyRole, "OWNER"> | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [isJoiningFamily, setIsJoiningFamily] = useState(false);
  const [isLeavingFamily, setIsLeavingFamily] = useState(false);
  const [expandedMemberFamilyId, setExpandedMemberFamilyId] = useState("");
  const [isLocationConsentOpen, setIsLocationConsentOpen] = useState(false);
  const [isLocationPolicyOpen, setIsLocationPolicyOpen] = useState(false);
  const [isLocationConsentChecked, setIsLocationConsentChecked] = useState(false);
  const [locationConsentUserId, setLocationConsentUserId] = useState("");
  const handleDataError = useCallback(
    (message: string) => showToast({ message, variant: "error" }),
    [showToast]
  );
  const handleLocationAddressChange = useCallback((memberId: string, address: string) => {
    setLocationAddresses((current) => ({ ...current, [memberId]: address }));
  }, []);

  useEffect(() => {
    if (!activeFamily || !user) {
      return;
    }

    let active = true;

    getFamilyMembers(activeFamily.id)
      .then((nextMembers) => {
        if (active) {
          setMembers(nextMembers);
        }
      })
      .catch((error: Error) => {
        if (active) {
          handleDataError(error.message);
        }
      });

    return () => {
      active = false;
    };
  }, [activeFamily, handleDataError, user]);

  useEffect(() => {
    if (!activeFamily || !user) {
      return;
    }

    const unsubscribe = subscribeFamilyLocations(activeFamily.id, setLiveLocations, handleDataError);

    return () => {
      unsubscribe();
    };
  }, [activeFamily, handleDataError, user]);

  useEffect(() => {
    if (!activeFamily || !user) {
      return;
    }

    const unsubscribes = [
      subscribeCalendarEvents({
        familyId: activeFamily.id,
        onChange: setCalendarEvents,
        onError: handleDataError,
        userId: user.uid,
      }),
      subscribeChatRooms({
        familyId: activeFamily.id,
        onChange: setChatRooms,
        onError: handleDataError,
        userId: user.uid,
      }),
      subscribeMemos({
        familyId: activeFamily.id,
        onChange: setMemos,
        onError: handleDataError,
        userId: user.uid,
      }),
      subscribePolls({
        familyId: activeFamily.id,
        onChange: setPolls,
        onError: handleDataError,
      }),
    ];

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [activeFamily, handleDataError, user]);

  useEffect(() => {
    if (!activeFamily || !user || getNotificationPermission() !== "granted") {
      return;
    }

    notifyDashboardReminders({
      events: calendarEvents,
      familyId: activeFamily.id,
      polls,
      userId: user.uid,
    });
  }, [activeFamily, calendarEvents, polls, user]);

  useEffect(() => {
    if (!locationShareMessage) {
      return;
    }

    showToast({
      message: locationShareMessage,
      variant: locationShareStatus === "error" ? "error" : "success",
    });
    clearLocationMessage();
  }, [clearLocationMessage, locationShareMessage, locationShareStatus, showToast]);

  if (status === "loading") {
    return (
      <Card>
        <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
          로그인 상태를 확인하고 있어요.
        </p>
      </Card>
    );
  }

  if (status === "guest") {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm lg:p-8">
          <p className="text-sm font-semibold text-brand">우리끼리</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight lg:text-5xl">
            멤버 위치, 일정, 메모, 투표를 한곳에서 관리해요
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--color-text-secondary)] lg:text-base">
            Google 계정으로 시작하고 크루를 만들거나 초대 코드로 참여하세요.
          </p>
        </section>
        <Card className="self-start">
          <h3 className="text-xl font-semibold">시작하기</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
            프로필 이미지는 Google 계정의 photoURL을 사용합니다.
          </p>
          <SignInConsentButton className="mt-5 w-full" />
          {authError ? (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
              {authError}
            </p>
          ) : null}
        </Card>
      </div>
    );
  }

  async function handleSendQuickMessage(member: FamilyMemberProfile, message: string) {
    if (!activeFamily || !user) {
      notify("크루를 먼저 선택해주세요.", "info");
      return;
    }

    setSendingQuickMessageTo(`${member.userId}-${message}`);

    try {
      const roomId = await getOrCreateFamilyRoom({
        createdBy: user.uid,
        familyId: activeFamily.id,
      });

      await sendTextMessage({
        createdBy: user.uid,
        familyId: activeFamily.id,
        roomId,
        text: createQuickMessageText(member, message),
      });

      notify("전체 채팅방으로 메시지를 보냈어요.", "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setSendingQuickMessageTo("");
    }
  }

  async function handleUpdateMemberRole(
    member: FamilyMemberProfile,
    nextRole: Exclude<FamilyRole, "OWNER">
  ) {
    if (!activeFamily || !user) {
      notify("크루를 먼저 선택해주세요.", "info");
      return;
    }

    setUpdatingMemberRoleId(member.userId);

    try {
      await updateFamilyMemberRole({
        actorUserId: user.uid,
        familyId: activeFamily.id,
        role: nextRole,
        targetUserId: member.userId,
      });

      setMembers(await getFamilyMembers(activeFamily.id));
      setSelectedManageMemberId("");
      setMemberManageView("ACTIONS");
      setPendingMemberRole(null);
      notify(`${member.displayName ?? member.nickname}님의 역할을 바꿨어요.`, "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setUpdatingMemberRoleId("");
    }
  }

  async function handleTransferOwnership(member: FamilyMemberProfile) {
    if (!activeFamily || !user || !isFamilyOwner) {
      return;
    }

    const confirmed = await confirm({
      confirmLabel: "승계하기",
      description: `${member.displayName ?? member.nickname}님이 새 크루장이 되고, 나는 부크루장으로 변경돼요. 크루 삭제 권한은 새 크루장에게만 있어요.`,
      title: "크루장을 승계할까요?",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setTransferringOwnerId(member.userId);
    try {
      await transferFamilyOwnership({
        actorUserId: user.uid,
        familyId: activeFamily.id,
        targetUserId: member.userId,
      });
      await refreshFamilies(activeFamily.id);
      setMembers(await getFamilyMembers(activeFamily.id));
      setSelectedManageMemberId("");
      setMemberManageView("ACTIONS");
      setPendingMemberRole(null);
      notify(`${member.displayName ?? member.nickname}님에게 크루장을 넘겼어요.`, "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setTransferringOwnerId("");
    }
  }

  async function handleDeleteMember(member: FamilyMemberProfile) {
    if (!activeFamily || !user) {
      notify("크루를 먼저 선택해주세요.", "info");
      return;
    }

    const confirmed = await confirm({
      confirmLabel: "삭제",
      description: `${member.displayName ?? member.nickname}님을 크루에서 삭제해요. 다시 참여하려면 초대 코드가 필요해요.`,
      title: "크루 멤버를 삭제할까요?",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setDeletingMemberId(member.userId);
    try {
      await deleteFamilyMember({
        actorUserId: user.uid,
        familyId: activeFamily.id,
        targetUserId: member.userId,
      });
      setMembers(await getFamilyMembers(activeFamily.id));
      setSelectedManageMemberId("");
      setMemberManageView("ACTIONS");
      setPendingMemberRole(null);
      notify("크루에서 멤버를 삭제했어요.", "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setDeletingMemberId("");
    }
  }

  async function handleLeaveFamily() {
    if (!activeFamily || !user || isFamilyOwner) {
      return;
    }

    const confirmed = await confirm({
      confirmLabel: "크루 나가기",
      description: `${activeFamily.name} 크루의 일정·메모·투표·채팅을 더 이상 볼 수 없어요.`,
      title: `'${activeFamily.name}' 크루에서 나갈까요?`,
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setIsLeavingFamily(true);

    try {
      await leaveFamily({ familyId: activeFamily.id, userId: user.uid });
      await refreshFamilies();
      notify("크루에서 나갔어요.", "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setIsLeavingFamily(false);
    }
  }

  async function handleCopyInviteCode() {
    if (!activeFamily) {
      notify("복사할 초대 코드가 없어요.", "info");
      return;
    }

    if (!navigator.clipboard || !window.isSecureContext) {
      notify("이 브라우저에서는 코드를 복사할 수 없어요.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(activeFamily.inviteCode);
      notify("초대 코드를 복사했어요.", "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    }
  }

  async function handleCopyInviteLink() {
    if (!activeFamily) {
      notify("복사할 초대 링크가 없어요.", "info");
      return;
    }

    if (!navigator.clipboard || !window.isSecureContext) {
      notify("이 브라우저에서는 링크를 복사할 수 없어요.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(getInviteUrl(activeFamily.inviteCode));
      notify("초대 링크를 복사했어요.", "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    }
  }

  async function handleShareInviteLink() {
    if (!activeFamily) {
      notify("공유할 초대 링크가 없어요.", "info");
      return;
    }

    const inviteUrl = getInviteUrl(activeFamily.inviteCode);

    try {
      if (navigator.share) {
        await navigator.share({
          text: `${activeFamily.name} 크루에 참여해주세요.`,
          title: "우리끼리 크루 초대",
          url: inviteUrl,
        });
        return;
      }

      if (!navigator.clipboard || !window.isSecureContext) {
        notify("이 브라우저에서는 링크를 공유할 수 없어요.", "error");
        return;
      }

      await navigator.clipboard.writeText(inviteUrl);
      notify("초대 링크를 복사했어요.", "success");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      notify(getErrorMessage(error), "error");
    }
  }

  async function handleJoinFamily() {
    if (!user || !inviteCode.trim()) {
      notify("초대 코드를 적어주세요.", "info");
      return;
    }

    setIsJoiningFamily(true);

    try {
      const result = await joinFamilyByInviteCode({ inviteCode, user });
      await refreshFamilies();
      setInviteCode("");
      notify(
        result.alreadyMember
          ? `이미 ${result.name} 크루에 참여 중이에요.`
          : `${result.name} 크루에 참여했어요. 헤더에서 전환할 수 있어요.`,
        result.alreadyMember ? "info" : "success"
      );
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setIsJoiningFamily(false);
    }
  }

  function handleLocationShareToggle() {
    if (isLocationShared) {
      void locationShare.stopCurrentLocationShare();
      return;
    }

    if (!user || hasLocationConsent) {
      void locationShare.shareCurrentLocation();
      return;
    }

    setIsLocationConsentOpen(true);
  }

  function acceptLocationConsent() {
    if (!user) {
      return;
    }

    saveLocationShareConsent(user.uid);
    setLocationConsentUserId(user.uid);
    setIsLocationConsentChecked(false);
    setIsLocationConsentOpen(false);
    void locationShare.shareCurrentLocation();
  }

  function notify(message: string, variant: "error" | "info" | "success") {
    showToast({ message, variant });
  }

  const isFamilyOwner =
    activeFamily?.role === "OWNER" ||
    members.some((member) => member.userId === user?.uid && member.role === "OWNER");
  const isFamilyViceOwner =
    activeFamily?.role === "VICE_OWNER" ||
    members.some((member) => member.userId === user?.uid && member.role === "VICE_OWNER");
  const currentFamilyRole: FamilyRole = isFamilyOwner
    ? "OWNER"
    : isFamilyViceOwner
      ? "VICE_OWNER"
      : activeFamily?.role ?? "MEMBER";
  const canInviteToFamily = isFamilyOwner || isFamilyViceOwner;
  const viceOwnerCount = members.filter((member) => member.role === "VICE_OWNER").length;
  const orderedMembers = [...members].sort(
    (left, right) => memberRoleOrder[left.role] - memberRoleOrder[right.role]
  );
  const isMemberListExpanded = expandedMemberFamilyId === activeFamily?.id && Boolean(activeFamily?.id);
  const visibleMembers = isMemberListExpanded
    ? orderedMembers
    : orderedMembers.slice(0, 6);
  const hasMoreMembers = orderedMembers.length > 6;
  const selectedLocationMember =
    members.find((member) => member.userId === selectedLocationMemberId) ?? null;
  const selectedLocation = selectedLocationMember
    ? liveLocations[selectedLocationMember.userId]
    : undefined;
  const selectedManageMember =
    members.find((member) => member.userId === selectedManageMemberId) ?? null;
  const hasLocationConsent = Boolean(
    user?.uid &&
      (locationConsentUserId === user.uid || hasLocationShareConsent(user.uid))
  );
  const isLocationShared =
    locationShare.isShared || Boolean(user?.uid && liveLocations[user.uid]);

  const homeSidebar = (
    <div className="grid gap-4">
      <section className="min-w-0 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <p className="truncate text-base font-semibold text-brand">
          오늘의 크루 상황 &gt; {truncateFamilyName(activeFamily?.name ?? "현재")} ({orderedMembers.length}명)
        </p>
        <p className="mt-1 text-sm leading-5 text-[var(--color-text-secondary)]">
          멤버들의 역할과 상태를 한눈에 확인해요.
        </p>
        {orderedMembers.length > 0 ? (
          <div className="mt-4 min-w-0 divide-y divide-[var(--color-border)]">
            {visibleMembers.map((member) => {
              const memberName = member.displayName ?? member.nickname;
              const memberRoleLabel =
                member.role === "OWNER"
                  ? "크루장"
                  : member.role === "VICE_OWNER"
                    ? "부크루장"
                    : "멤버";
              const memberRoleBadgeClass =
                member.role === "OWNER"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300"
                  : member.role === "VICE_OWNER"
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

              return (
                <div
                  className="flex min-w-0 items-center gap-2 py-1.5"
                  key={member.userId}
                >
                  <div className="relative size-9 shrink-0">
                    <Avatar alt={memberName} className="size-9" src={member.photoURL} />
                    {member.role === "OWNER" || member.role === "VICE_OWNER" ? (
                      <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-[var(--color-surface)]">
                        <FamilyRoleIndicator className="!size-4" role={member.role} />
                      </span>
                    ) : null}
                  </div>
                  <p className="min-w-0 flex-1 truncate text-sm">
                    <strong>{memberName}</strong>
                  </p>
                  <span
                    className={`inline-flex h-5 max-w-[5.5rem] shrink-0 items-center truncate rounded-full px-1.5 text-[10px] font-semibold leading-5 ${memberRoleBadgeClass}`}
                  >
                    {memberRoleLabel}
                  </span>
                  {member.role === "OWNER" && isFamilyOwner ? (
                    <Link
                      aria-label="크루 설정"
                      className="grid size-8 shrink-0 place-items-center text-[var(--color-text-secondary)] transition hover:text-brand"
                      to="/profile?tab=group"
                    >
                      <GearSix size={18} weight="regular" />
                    </Link>
                  ) : isFamilyOwner && member.role !== "OWNER" ? (
                    <button
                      aria-label={`${memberName} 관리`}
                      className="grid size-8 shrink-0 place-items-center text-[var(--color-text-secondary)] transition hover:text-brand"
                      onClick={() => {
                        setSelectedManageMemberId(member.userId);
                        setMemberManageView("ACTIONS");
                        setPendingMemberRole(null);
                      }}
                      type="button"
                    >
                      <DotsThreeVertical size={20} weight="bold" />
                    </button>
                  ) : !isFamilyOwner && member.userId === user?.uid ? (
                    <button
                      aria-label="크루 나가기"
                      className="grid size-8 shrink-0 place-items-center text-[var(--color-text-secondary)] transition hover:text-red-600 disabled:opacity-50"
                      disabled={isLeavingFamily}
                      onClick={() => void handleLeaveFamily()}
                      type="button"
                    >
                      <SignOut size={18} weight="bold" />
                    </button>
                  ) : null}
                </div>
              );
            })}
            {hasMoreMembers ? (
              <button
                className="w-full pt-3 text-left text-sm font-semibold text-brand"
                onClick={() =>
                  setExpandedMemberFamilyId(isMemberListExpanded ? "" : activeFamily?.id ?? "")
                }
                type="button"
              >
                {isMemberListExpanded ? "멤버 접기" : `멤버 ${orderedMembers.length - 6}명 더 보기`}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm leading-5 text-[var(--color-text-secondary)]">
            크루를 만들거나 초대 코드로 참여하면 크루 상황이 표시됩니다.
          </p>
        )}
      </section>

      <Card>
        <div className="grid gap-3">
          {activeFamily ? (
            <div className="min-w-0">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <FamilyRoleIndicator role={currentFamilyRole} />
                      <strong className="min-w-0 truncate">{truncateFamilyName(activeFamily.name)}</strong>
                    </div>
                    {canInviteToFamily ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          aria-label={`초대코드 ${activeFamily.inviteCode} 복사`}
                          className="flex min-w-0 max-w-[10rem] items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:text-brand"
                          onClick={() => void handleCopyInviteCode()}
                          type="button"
                        >
                          <span className="truncate">초대코드 {activeFamily.inviteCode}</span>
                          <CopySimple className="shrink-0" size={14} weight="regular" />
                        </button>
                      </div>
                    ) : null}
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
                  {canInviteToFamily
                    ? "초대코드를 공유해 크루 멤버를 초대할 수 있어요."
                    : "초대코드는 크루장이 관리해요."}
              </p>
            </div>
              {canInviteToFamily ? (
                <div className="mt-3 grid w-full min-w-0 grid-cols-2 gap-2">
                  <Button
                    aria-label="크루 초대 링크 복사"
                    className="h-9 min-w-0 w-full px-3 text-xs"
                    onClick={() => void handleCopyInviteLink()}
                    type="button"
                    variant="secondary"
                  >
                    <LinkSimple className="shrink-0" size={15} weight="regular" />
                    링크 복사
                  </Button>
                  <Button
                    aria-label="크루 공유하기"
                    className="h-9 min-w-0 w-full px-3 text-xs"
                    onClick={() => void handleShareInviteLink()}
                    type="button"
                    variant="secondary"
                  >
                    <ShareNetwork size={15} weight="regular" />
                    공유하기
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
          <Button
            className={isLocationShared ? "bg-red-600 text-white hover:bg-red-700" : ""}
            disabled={locationShare.isSharing}
            loading={locationShare.isSharing}
            onClick={handleLocationShareToggle}
          >
            <MapPin size={18} weight="bold" />
            {isLocationShared ? "위치 공유 끊기" : "위치 공유하기"}
          </Button>
        </div>
      </Card>
      <Card className="grid gap-2">
        <div>
          <p className="text-base font-semibold">새 크루 참여</p>
          <p className="mt-1 text-sm leading-5 text-[var(--color-text-secondary)]">
            현재 크루를 유지한 채 새 크루에 참여해요.
          </p>
        </div>
        <div className="flex min-w-0 items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              className="w-full"
              label=""
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              placeholder="초대코드를 입력해주세요"
              value={inviteCode}
            />
          </div>
          <Button
            className="shrink-0 whitespace-nowrap"
            disabled={isJoiningFamily}
            loading={isJoiningFamily}
            onClick={() => void handleJoinFamily()}
            variant="secondary"
          >
            참여하기
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <>
    <DesktopWorkspace sidebar={homeSidebar}>

      <div className="grid min-w-0 gap-4">
        <Card>
          {members.length === 0 ? (
            <>
              <div className="flex items-center gap-2">
                <MapPin className="text-brand" size={22} weight="bold" />
                <h3 className="text-base font-semibold">멤버 위치</h3>
              </div>
              <p className="mt-4 rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm text-[var(--color-text-secondary)]">
                크루 멤버가 있으면 위치 핀이 표시됩니다.
              </p>
            </>
          ) : (
              <FamilyLocationMap
                locations={liveLocations}
                members={members}
                onAddressChange={handleLocationAddressChange}
                onSelectMember={setSelectedLocationMemberId}
              />
          )}
        </Card>
        <DashboardSwipeSection
          calendarEvents={calendarEvents}
          chatRooms={chatRooms}
          memos={memos}
          polls={polls}
        />
      </div>
    </DesktopWorkspace>
    <BottomSheet
      isOpen={Boolean(selectedLocationMember)}
      onClose={() => setSelectedLocationMemberId("")}
      title={selectedLocationMember?.displayName ?? selectedLocationMember?.nickname ?? "멤버 위치"}
    >
      {selectedLocationMember ? (
        <FamilyLocationPin
          location={selectedLocation}
          address={selectedLocation ? locationAddresses[selectedLocationMemberId] : undefined}
          member={selectedLocationMember}
          onQuickMessage={handleSendQuickMessage}
          sendingMessageKey={sendingQuickMessageTo}
        />
      ) : null}
     </BottomSheet>
    <BottomSheet
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => {
              setIsLocationConsentChecked(false);
              setIsLocationConsentOpen(false);
            }}
            type="button"
            variant="secondary"
          >
            나중에
          </Button>
          <Button disabled={!isLocationConsentChecked} onClick={acceptLocationConsent} type="button">
            위치 공유 시작
          </Button>
        </div>
      }
      isOpen={isLocationConsentOpen}
      onClose={() => {
        setIsLocationConsentChecked(false);
        setIsLocationConsentOpen(false);
      }}
      title="위치 공유"
    >
      <div className="grid gap-4">
        <div className="grid place-items-center gap-3 rounded-2xl bg-brand-soft p-6 text-center">
          <MapPin className="text-brand" size={32} weight="regular" />
          <p className="text-base font-semibold">현재 위치를 크루와 공유할까요?</p>
        </div>
        <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
          허용하면 현재 선택한 크루 멤버에게 위치가 보여요. 이동할 때만 최대 10초 간격으로 갱신하고, 위치 공유를 끄면 바로 중단해요.
        </p>
        <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
          다음 단계에서 브라우저 위치 권한을 허용해주세요. 권한을 거절해도 다른 기능은 계속 사용할 수 있어요.
        </p>
        <div className="flex items-start gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-3">
          <AnimatedCheckbox
            aria-label="위치정보 이용약관 확인 및 동의"
            checked={isLocationConsentChecked}
            onChange={(event) => setIsLocationConsentChecked(event.target.checked)}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">위치정보 이용약관을 확인했고 동의해요.</p>
            <button
              className="mt-1 text-xs font-semibold text-brand underline underline-offset-2"
              onClick={() => setIsLocationPolicyOpen(true)}
              type="button"
            >
              내용 보기
            </button>
          </div>
        </div>
      </div>
    </BottomSheet>
    <BottomSheet
      isOpen={isLocationPolicyOpen}
      onClose={() => setIsLocationPolicyOpen(false)}
      title={policyDocuments.location.title}
    >
      <PolicyDocumentView documentId="location" />
    </BottomSheet>
    <BottomSheet
      isOpen={Boolean(selectedManageMember)}
      onClose={() => {
        setSelectedManageMemberId("");
        setMemberManageView("ACTIONS");
        setPendingMemberRole(null);
      }}
      title={
        memberManageView === "ROLE"
          ? "멤버 역할 변경"
          : selectedManageMember?.displayName ?? selectedManageMember?.nickname ?? "멤버 관리"
      }
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
      {selectedManageMember && memberManageView === "ACTIONS" ? (
        <div className="grid gap-3">
          <MemberSheetProfile member={selectedManageMember} />
          <BottomSheetItem
            onClick={() => {
              setPendingMemberRole(
                selectedManageMember.role as Exclude<FamilyRole, "OWNER">
              );
              setMemberManageView("ROLE");
            }}
            type="button"
            >
            <span>멤버 역할 변경</span>
            <span className="text-xs text-[var(--color-text-secondary)]">
              {roleLabels[selectedManageMember.role]}
            </span>
          </BottomSheetItem>
          <BottomSheetItem
            disabled={transferringOwnerId === selectedManageMember.userId}
            onClick={() => void handleTransferOwnership(selectedManageMember)}
            type="button"
          >
            <span>크루장 승계</span>
            <FamilyRoleIndicator role="OWNER" />
          </BottomSheetItem>
          <BottomSheetItem
            disabled={deletingMemberId === selectedManageMember.userId}
            onClick={() => void handleDeleteMember(selectedManageMember)}
            tone="danger"
            type="button"
          >
            <span>삭제</span>
            <Trash size={18} />
          </BottomSheetItem>
        </div>
      ) : null}
      {selectedManageMember && memberManageView === "ROLE" ? (
        <div className="grid gap-3">
          <MemberSheetProfile member={selectedManageMember} />
          <div className="grid gap-2">
            {editableRoleOptions.map((role) => (
              <BottomSheetItem
                active={pendingMemberRole === role || selectedManageMember.role === role}
                disabled={
                  updatingMemberRoleId === selectedManageMember.userId ||
                  selectedManageMember.role === role ||
                  (role === "VICE_OWNER" &&
                    viceOwnerCount >= 2 &&
                    selectedManageMember.role !== "VICE_OWNER")
                }
                key={role}
                onClick={() => setPendingMemberRole(role)}
                type="button"
              >
                <span>{roleLabels[role]}</span>
                {pendingMemberRole === role ? (
                  <span className="text-xs">현재 역할</span>
                ) : null}
              </BottomSheetItem>
            ))}
          </div>
          <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
            부크루장은 최대 2명까지 지정할 수 있고 초대 기능을 사용할 수 있어요.
          </p>
          <Button
            className="w-full"
            disabled={
              !pendingMemberRole ||
              pendingMemberRole === selectedManageMember.role ||
              updatingMemberRoleId === selectedManageMember.userId
            }
            onClick={() => {
              if (pendingMemberRole) {
                void handleUpdateMemberRole(selectedManageMember, pendingMemberRole);
              }
            }}
            type="button"
          >
            <Check size={18} weight="bold" />
            변경하기
          </Button>
        </div>
      ) : null}
    </BottomSheet>
    </>
  );
}

function MemberSheetProfile({ member }: { member: FamilyMemberProfile }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-3">
      <Avatar alt={member.displayName ?? member.nickname} src={member.photoURL} />
      <div className="min-w-0">
        <strong className="block truncate">{member.displayName ?? member.nickname}</strong>
        <div className="mt-1 flex min-w-0 items-center gap-1 truncate text-xs font-semibold text-[var(--color-text-secondary)]">
          {member.role === "OWNER" || member.role === "VICE_OWNER" ? (
            <FamilyRoleIndicator role={member.role} />
          ) : (
            roleLabels[member.role]
          )}
          <span className="truncate">· {member.email ?? "이메일 없음"}</span>
        </div>
      </div>
    </div>
  );
}

function DashboardSwipeSection({
  calendarEvents,
  chatRooms,
  memos,
  polls,
}: {
  calendarEvents: CalendarEvent[];
  chatRooms: ChatRoom[];
  memos: Memo[];
  polls: Poll[];
}) {
  const cards = [
    {
      emptyText: "이번 달 일정이 없어요.",
      icon: <CalendarDots className="text-brand" size={22} weight="bold" />,
      items: getThisMonthEvents(calendarEvents).slice(0, 4).map((event) => ({
        label: event.title,
        meta: formatEventMeta(event),
      })),
      title: "이달의 일정",
    },
    {
      emptyText: "최근 메모나 투표가 없어요.",
      icon: <Note className="text-brand" size={22} weight="bold" />,
      items: [
        ...memos.slice(0, 2).map((memo) => ({
          label: memo.title,
          meta: memo.type === "SENSITIVE" ? "민감 메모" : "일반 메모",
        })),
        ...polls.slice(0, 2).map((poll) => ({
          label: poll.title,
          meta: poll.type === "DATE" ? "날짜 투표" : "일반 투표",
        })),
      ].slice(0, 4),
      title: "최근 메모와 투표",
    },
    {
      emptyText: "최근 채팅이 없어요.",
      icon: <ChatCircleDots className="text-brand" size={22} weight="bold" />,
      items: chatRooms.slice(0, 4).map((room) => ({
        label: room.name,
        meta: room.lastMessageText ?? "아직 대화가 없어요.",
      })),
      title: "최근 채팅",
    },
  ];

  return (
    <section className="relative min-w-0 overflow-hidden">
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-3 lg:overflow-visible">
        {cards.map((card) => (
          <Card className="min-h-[178px] min-w-[82%] snap-start sm:min-w-[46%] lg:min-w-0" key={card.title}>
            <div className="flex items-center gap-2">
              {card.icon}
              <h3 className="text-base font-semibold">{card.title}</h3>
            </div>
            <DashboardList emptyText={card.emptyText} items={card.items} />
          </Card>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[var(--color-bg)] to-transparent lg:hidden" />
    </section>
  );
}

function FamilyLocationMap({
  locations,
  members,
  onAddressChange,
  onSelectMember,
}: {
  locations: Record<string, LiveLocation>;
  members: FamilyMemberProfile[];
  onAddressChange: (memberId: string, address: string) => void;
  onSelectMember: (memberId: string) => void;
}) {
  const pins = useMemo(
    () =>
      members
        .map((member) => {
          const location = locations[member.userId];

          return location ? { location, member } : null;
        })
        .filter((pin): pin is { location: LiveLocation; member: FamilyMemberProfile } =>
          Boolean(pin)
        ),
    [locations, members]
  );
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const [mapStatus, setMapStatus] = useState<"FALLBACK" | "LOADING" | "READY">("FALLBACK");
  const [mapError, setMapError] = useState("");
  const [projectedPositions, setProjectedPositions] = useState<Record<string, MapPinPosition>>({});
  const [focusedMemberId, setFocusedMemberId] = useState("");
  const geocodedPositionKeysRef = useRef(new Set<string>());
  const bounds = pins.length > 0 ? getLocationBounds(pins.map((pin) => pin.location)) : null;
  const fallbackPositions = Object.fromEntries(
    bounds
      ? pins.map(({ location, member }) => [
          member.userId,
          { ...getLocationPinPosition(location, bounds), unit: "%" as const },
        ])
      : []
  );

  function resetMapView() {
    const map = mapRef.current;

    if (!map || pins.length === 0) {
      return;
    }

    setFocusedMemberId("");

    const kakao = getKakaoMaps();
    const center = getAverageLocation(pins.map((pin) => pin.location));
    const kakaoBounds = new kakao.LatLngBounds();

    pins.forEach(({ location }) => {
      kakaoBounds.extend(new kakao.LatLng(location.latitude, location.longitude));
    });

    if (pins.length > 1) {
      map.setBounds(kakaoBounds, 44, 44, 44, 44);
    } else {
      map.setCenter(new kakao.LatLng(center.latitude, center.longitude));
    }

    window.setTimeout(() => {
      map.relayout();
      setProjectedPositions(projectKakaoPinPositions(map, pins));
    }, 100);
  }

  function focusMember(memberId: string) {
    const map = mapRef.current;
    const targetPin = pins.find(({ member }) => member.userId === memberId);

    setFocusedMemberId(memberId);

    if (!map || !targetPin) {
      return;
    }

    const kakao = getKakaoMaps();
    map.setCenter(
      new kakao.LatLng(targetPin.location.latitude, targetPin.location.longitude)
    );
    map.setLevel(3, { animate: true });

    window.setTimeout(() => {
      map.relayout();
      setProjectedPositions(projectKakaoPinPositions(map, pins));
    }, 250);
  }

  useEffect(() => {
    let active = true;

    async function initializeMap() {
      const container = mapContainerRef.current;

      if (!container || pins.length === 0) {
        return;
      }

      setMapStatus("LOADING");
      setMapError("");

      try {
        await loadKakaoMapScript();

        if (!active) {
          return;
        }

        const kakao = getKakaoMaps();
        const center = getAverageLocation(pins.map((pin) => pin.location));
        const map =
          mapRef.current ??
          new kakao.Map(container, {
            center: new kakao.LatLng(center.latitude, center.longitude),
            level: 5,
          });

        mapRef.current = map;
        map.setDraggable(true);
        map.setZoomable(true);

        const kakaoBounds = new kakao.LatLngBounds();
        pins.forEach(({ location }) => {
          kakaoBounds.extend(new kakao.LatLng(location.latitude, location.longitude));
        });

        if (pins.length > 1) {
          map.setBounds(kakaoBounds, 44, 44, 44, 44);
        } else {
          map.setCenter(new kakao.LatLng(center.latitude, center.longitude));
        }

        kakao.event.addListener(map, "idle", () => {
          if (active) {
            setProjectedPositions(projectKakaoPinPositions(map, pins));
          }
        });

        window.setTimeout(() => {
          if (active) {
            map.relayout();
            setProjectedPositions(projectKakaoPinPositions(map, pins));
            setMapStatus("READY");
          }
        }, 100);
      } catch {
        if (active) {
          setMapStatus("FALLBACK");
          setMapError("카카오 지도를 불러오지 못해 기본 위치 영역을 표시합니다.");
        }
      }
    }

    void initializeMap();

    return () => {
      active = false;
    };
  }, [pins]);

  useEffect(() => {
    if (mapStatus !== "READY" || pins.length === 0) {
      return;
    }

    const kakao = getKakaoMaps();
    const geocoder = new kakao.services.Geocoder();
    let active = true;

    pins.forEach(({ location, member }) => {
      const positionKey = `${member.userId}:${location.latitude.toFixed(5)},${location.longitude.toFixed(5)}`;

      if (geocodedPositionKeysRef.current.has(positionKey)) {
        return;
      }

      geocodedPositionKeysRef.current.add(positionKey);
      geocoder.coord2Address(
        location.longitude,
        location.latitude,
        (result, status) => {
          if (!active || status !== kakao.services.Status.OK) {
            return;
          }

          const address =
            result[0]?.road_address?.address_name ?? result[0]?.address?.address_name;

          if (address) {
            onAddressChange(member.userId, address);
          }
        }
      );
    });

    return () => {
      active = false;
    };
  }, [mapStatus, onAddressChange, pins]);

  if (pins.length === 0) {
    return (
      <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 text-center">
        <div>
          <MapPin className="mx-auto text-slate-400" size={28} weight="bold" />
          <p className="mt-3 text-sm font-semibold text-[var(--color-text-secondary)]">
            현재 위치 공유를 누르면 지도 위에 멤버 위치 핀이 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <MapPin className="shrink-0 text-brand" size={22} weight="bold" />
          <h3 className="min-w-0 truncate text-base font-semibold">멤버 위치</h3>
        </div>
        <IconButton
          aria-label="지도 초기화"
          label="지도 초기화"
          onClick={resetMapView}
          variant="ghost"
        >
          <ArrowCounterClockwise size={18} weight="bold" />
        </IconButton>
      </div>
      <div className="relative min-h-[220px] min-w-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-emerald-50">
        <div
          className={`absolute inset-0 z-0 ${mapStatus === "READY" ? "opacity-100" : "opacity-0"}`}
          ref={mapContainerRef}
        />
        <div className={`absolute inset-0 z-0 opacity-70 ${mapStatus === "READY" ? "hidden" : ""}`}>
          <div className="absolute left-0 top-1/4 h-px w-full bg-white/80" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-white/80" />
          <div className="absolute left-0 top-3/4 h-px w-full bg-white/80" />
          <div className="absolute left-1/4 top-0 h-full w-px bg-white/80" />
          <div className="absolute left-1/2 top-0 h-full w-px bg-white/80" />
          <div className="absolute left-3/4 top-0 h-full w-px bg-white/80" />
          {mapError ? (
            <p className="absolute inset-x-4 bottom-4 rounded-xl bg-white/90 p-3 text-center text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm">
              {mapError}
            </p>
          ) : null}
        </div>
        {pins.map(({ member }) => {
          const position = projectedPositions[member.userId] ?? fallbackPositions[member.userId];

          return (
            <button
              aria-label={`${member.displayName ?? member.nickname} 위치 보기`}
              className="absolute z-20 -translate-x-1/2 -translate-y-full"
              key={member.userId}
              onClick={() => onSelectMember(member.userId)}
              style={{
                left: `${position.x}${position.unit}`,
                top: `${position.y}${position.unit}`,
              }}
              type="button"
            >
              <LocationMapPin member={member} />
            </button>
          );
        })}
      </div>
      <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pins.map(({ member }) => {
          const name = member.displayName ?? member.nickname;
          const isFocused = focusedMemberId === member.userId;

          return (
            <button
              aria-label={`${name} 위치로 확대`}
              className={`grid size-12 shrink-0 place-items-center rounded-full border-2 transition ${
                isFocused
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-brand"
              }`}
              key={member.userId}
              onClick={() => focusMember(member.userId)}
              type="button"
            >
              {member.photoURL ? (
                <img
                  alt=""
                  className="size-10 rounded-full object-cover ring-1 ring-inset ring-black/[0.04]"
                  src={member.photoURL}
                />
              ) : (
                <span className="grid size-10 place-items-center rounded-full bg-white text-xs text-brand">
                  {getLocationPinLabel(member)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LocationMapPin({ member }: { member: FamilyMemberProfile }) {
  return (
    <svg
      aria-hidden="true"
      className="block h-[62px] w-12 drop-shadow-[0_8px_14px_rgba(4,120,87,0.22)] transition active:scale-95"
      fill="none"
      viewBox="0 0 48 62"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M48 24C48 37.2548 24 62 24 62C24 62 0 37.2548 0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24Z"
        fill="var(--color-primary)"
      />
      <circle cx="24" cy="24" fill="#F4F4F4" r="18" />
      <foreignObject height="36" width="36" x="6" y="6">
        <div className="grid size-9 place-items-center overflow-hidden rounded-full bg-[#F4F4F4] text-[11px] font-semibold text-brand ring-1 ring-inset ring-black/[0.04]">
          {member.photoURL ? (
            <img
              alt={member.displayName ?? member.nickname}
              className="size-full rounded-full object-cover"
              src={member.photoURL}
            />
          ) : (
            <span className="px-1 text-center leading-4">
              {getLocationPinLabel(member)}
            </span>
          )}
        </div>
      </foreignObject>
    </svg>
  );
}

function DashboardList({
  emptyText,
  items,
}: {
  emptyText: string;
  items: { label: string; meta: string }[];
}) {
  if (items.length === 0) {
    return (
      <p className="mt-4 rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm text-[var(--color-text-secondary)]">
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="mt-4 min-w-0 space-y-3 overflow-hidden text-sm">
      {items.map((item) => (
        <li className="flex min-w-0 justify-between gap-3" key={`${item.label}-${item.meta}`}>
          <span className="min-w-0 truncate">{item.label}</span>
          <span className="min-w-0 max-w-[58%] shrink truncate text-right font-normal text-[var(--color-text-secondary)]">
            {item.meta}
          </span>
        </li>
      ))}
    </ul>
  );
}

function FamilyLocationPin({
  address,
  location,
  member,
  onQuickMessage,
  sendingMessageKey,
}: {
  address?: string;
  location?: LiveLocation;
  member: FamilyMemberProfile;
  onQuickMessage: (member: FamilyMemberProfile, message: string) => void;
  sendingMessageKey: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-4">
      <Avatar alt={member.displayName ?? member.nickname} src={member.photoURL} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <strong className="truncate">{member.displayName ?? member.nickname}</strong>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              location ? "bg-brand-soft text-brand" : "bg-slate-200 text-slate-500"
            }`}
          >
            {location ? "공유중" : "대기"}
          </span>
        </div>
        <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">
          {location
            ? formatLocationPreview(location, address)
            : "아직 공유된 위치가 없어요."}
        </p>
        {location ? (
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-[var(--color-text-secondary)]">
            <span>{formatUpdatedAt(location.updatedAt)}</span>
            <span>정확도 {formatAccuracy(location.accuracy)}</span>
            <span>{formatBattery(location)}</span>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {quickMessages.map((message) => {
            const messageKey = `${member.userId}-${message}`;

            return (
              <button
                className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-brand hover:text-brand disabled:opacity-50"
                disabled={sendingMessageKey === messageKey}
                key={message}
                onClick={() => onQuickMessage(member, message)}
                type="button"
              >
                {sendingMessageKey === messageKey ? "전송중" : message}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatEventMeta(event: CalendarEvent) {
  const tags = [
    getDDayLabel(event),
    event.startDate.slice(5),
    event.repeat === "YEARLY" ? "매년" : "",
    event.isDayOff ? "휴무" : "",
  ].filter(Boolean);

  return tags.join(" · ");
}

function formatLocationPreview(location: LiveLocation, address?: string) {
  return address ?? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
}

function getInviteUrl(inviteCode: string) {
  return new URL(
    `${import.meta.env.BASE_URL}invite/${encodeURIComponent(inviteCode)}`,
    window.location.origin
  ).toString();
}

function getLocationPinLabel(member: FamilyMemberProfile) {
  const name = member.displayName ?? member.nickname;

  return name.length > 3 ? name.slice(0, 2) : name;
}

function loadKakaoMapScript() {
  if (window.kakao?.maps) {
    return new Promise<void>((resolve) => window.kakao?.maps.load(resolve));
  }

  if (kakaoMapScriptPromise) {
    return kakaoMapScriptPromise;
  }

  const scriptPromise = new Promise<void>((resolve, reject) => {
    const handleScriptReady = () => {
      if (!window.kakao?.maps?.load) {
        reject(new Error("현재 주소에서는 지도를 사용할 수 없어요. Kakao 지도 키 설정을 확인해주세요."));
        return;
      }

      window.kakao.maps.load(resolve);
    };
    const existingScript = document.getElementById("kakao-map-sdk");

    if (existingScript) {
      existingScript.addEventListener("load", handleScriptReady, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.id = "kakao-map-sdk";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(kakaoMapJavaScriptKey)}&autoload=false&libraries=services`;
    script.addEventListener("load", handleScriptReady, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.appendChild(script);
  });

  kakaoMapScriptPromise = scriptPromise.catch((error) => {
    kakaoMapScriptPromise = null;
    throw error;
  });

  return kakaoMapScriptPromise;
}

function getKakaoMaps() {
  if (!window.kakao?.maps) {
    throw new Error("지도를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
  }

  return window.kakao.maps;
}

function getAverageLocation(locations: LiveLocation[]) {
  const total = locations.reduce(
    (sum, location) => ({
      latitude: sum.latitude + location.latitude,
      longitude: sum.longitude + location.longitude,
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: total.latitude / locations.length,
    longitude: total.longitude / locations.length,
  };
}

function projectKakaoPinPositions(
  map: KakaoMap,
  pins: { location: LiveLocation; member: FamilyMemberProfile }[]
): Record<string, MapPinPosition> {
  const kakao = getKakaoMaps();
  const projection = map.getProjection();

  return Object.fromEntries(
    pins.map(({ location, member }) => {
      const point = projection.containerPointFromCoords(
        new kakao.LatLng(location.latitude, location.longitude)
      );

      return [member.userId, { unit: "px", x: point.x, y: point.y }];
    })
  );
}

function getLocationBounds(locations: LiveLocation[]) {
  const latitudes = locations.map((location) => location.latitude);
  const longitudes = locations.map((location) => location.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    maxLatitude,
    maxLongitude,
    minLatitude,
    minLongitude,
  };
}

function getLocationPinPosition(
  location: LiveLocation,
  bounds: ReturnType<typeof getLocationBounds>
) {
  const latitudeRange = Math.max(bounds.maxLatitude - bounds.minLatitude, 0.0008);
  const longitudeRange = Math.max(bounds.maxLongitude - bounds.minLongitude, 0.0008);
  const x = ((location.longitude - bounds.minLongitude) / longitudeRange) * 72 + 14;
  const y = (1 - (location.latitude - bounds.minLatitude) / latitudeRange) * 62 + 28;

  return {
    x: Math.min(86, Math.max(14, x)),
    y: Math.min(90, Math.max(30, y)),
  };
}

function formatUpdatedAt(updatedAt: number) {
  const diffMs = Date.now() - updatedAt;
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000));

  if (diffMinutes < 1) {
    return "방금 업데이트";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전 업데이트`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}시간 전 업데이트`;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(updatedAt));
}

function formatAccuracy(accuracy: number | null) {
  if (accuracy === null) {
    return "알 수 없음";
  }

  return `${Math.round(accuracy)}m`;
}

function formatBattery(location: LiveLocation) {
  if (location.battery === null) {
    return "배터리 알 수 없음";
  }

  return location.charging ? `충전중 ${location.battery}%` : `배터리 ${location.battery}%`;
}

function createQuickMessageText(member: FamilyMemberProfile, message: string) {
  const name = member.displayName ?? member.nickname;
  return `${name}님, ${message}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "잠시 문제가 생겼어요. 다시 시도해주세요.";
}
