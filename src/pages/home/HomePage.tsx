import {
  BatteryHigh,
  BellRinging,
  CalendarDots,
  CaretLeft,
  ChatCircleDots,
  DotsThreeVertical,
  GoogleLogo,
  LinkSimple,
  MapPin,
  Note,
  Plus,
  Trash,
  UsersThree,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Avatar } from "../../components/common/Avatar";
import { BottomSheet } from "../../components/common/BottomSheet";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { useConfirmDialog } from "../../components/common/confirmDialogContext";
import { Input } from "../../components/common/Input";
import { useToast } from "../../components/common/toastContext";
import { useAuth } from "../../features/auth/useAuth";
import {
  createFamily,
  deleteFamilyMember,
  getFamilyMembers,
  getFirstFamilyForUser,
  joinFamilyByInviteCode,
  updateFamilyMemberRole,
} from "../../features/family/services/familyService";
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
import { useMyLocationShare } from "../../features/location/hooks/useMyLocationShare";
import { subscribeFamilyLocations } from "../../features/location/services/locationService";
import type { LiveLocation } from "../../features/location/types/locationTypes";
import { subscribeMemos } from "../../features/memo/services/memoService";
import type { Memo } from "../../features/memo/types/memoTypes";
import {
  getNotificationAvailability,
  getNotificationPermission,
  notifyDashboardReminders,
  requestNotificationPermission,
} from "../../features/notification/services/notificationService";
import { subscribePolls } from "../../features/poll/services/pollService";
import type { Poll } from "../../features/poll/types/pollTypes";

const quickMessages = ["어디야?", "언제 와?", "오는 길에 마트 들러줘!"];
const editableRoleOptions: Exclude<FamilyRole, "OWNER">[] = [
  "PARENT",
  "MEMBER",
  "CHILD",
];
const roleLabels: Record<FamilyRole, string> = {
  CHILD: "자녀",
  MEMBER: "구성원",
  OWNER: "오너",
  PARENT: "부모",
};

export function HomePage() {
  const { authError, signIn, status, user } = useAuth();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [activeFamily, setActiveFamily] = useState<{
    id: string;
    inviteCode: string;
    name: string;
  } | null>(null);
  const [members, setMembers] = useState<FamilyMemberProfile[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendingQuickMessageTo, setSendingQuickMessageTo] = useState("");
  const [updatingMemberRoleId, setUpdatingMemberRoleId] = useState("");
  const [deletingMemberId, setDeletingMemberId] = useState("");
  const [liveLocations, setLiveLocations] = useState<Record<string, LiveLocation>>({});
  const [selectedLocationMemberId, setSelectedLocationMemberId] = useState("");
  const [selectedManageMemberId, setSelectedManageMemberId] = useState("");
  const [memberManageView, setMemberManageView] = useState<"ACTIONS" | "ROLE">("ACTIONS");
  const [memos, setMemos] = useState<Memo[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const locationShare = useMyLocationShare({
    familyId: activeFamily?.id ?? null,
    userId: user?.uid ?? null,
  });

  useEffect(() => {
    if (!user || activeFamily) {
      return;
    }

    void getFirstFamilyForUser(user.uid).then(async (result) => {
      if (!result) {
        return;
      }

      setActiveFamily(result);
      setMembers(await getFamilyMembers(result.id));
    });
  }, [activeFamily, user]);

  useEffect(() => {
    if (!activeFamily || !user) {
      return;
    }

    const unsubscribes = [
      subscribeCalendarEvents({
        familyId: activeFamily.id,
        onChange: setCalendarEvents,
        onError: setFeedback,
        userId: user.uid,
      }),
      subscribeChatRooms({
        familyId: activeFamily.id,
        onChange: setChatRooms,
        onError: setFeedback,
        userId: user.uid,
      }),
      subscribeMemos({
        familyId: activeFamily.id,
        onChange: setMemos,
        onError: setFeedback,
        userId: user.uid,
      }),
      subscribePolls({
        familyId: activeFamily.id,
        onChange: setPolls,
        onError: setFeedback,
      }),
      subscribeFamilyLocations(activeFamily.id, setLiveLocations, setFeedback),
    ];

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [activeFamily, user]);

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

  async function handleCreateFamily() {
    if (!user || !familyName.trim()) {
      notify("가족 이름을 입력해주세요.", "info");
      return;
    }

    setIsSubmitting(true);
    setFeedback("");

    try {
      const result = await createFamily({ name: familyName.trim(), owner: user });
      setActiveFamily({
        id: result.id,
        inviteCode: result.inviteCode,
        name: familyName.trim(),
      });
      setMembers(await getFamilyMembers(result.id));
      notify(`가족이 생성되었습니다. 초대 코드: ${result.inviteCode}`, "success");
      setFamilyName("");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoinFamily() {
    if (!user || !inviteCode.trim()) {
      notify("초대 코드를 입력해주세요.", "info");
      return;
    }

    setIsSubmitting(true);
    setFeedback("");

    try {
      const result = await joinFamilyByInviteCode({
        inviteCode,
        user,
      });
      setActiveFamily({
        id: result.id,
        inviteCode: inviteCode.trim().toUpperCase(),
        name: result.name,
      });
      setMembers(await getFamilyMembers(result.id));
      notify(`${result.name} 가족에 참여했습니다.`, "success");
      setInviteCode("");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <Card>
        <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
          로그인 상태를 확인하고 있습니다.
        </p>
      </Card>
    );
  }

  if (status === "guest") {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm lg:p-8">
          <p className="text-sm font-semibold text-brand">우리 가족 스마트 홈</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight lg:text-5xl">
            가족 위치, 일정, 메모, 투표를 한곳에서 관리해요
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--color-text-secondary)] lg:text-base">
            Google 계정으로 시작하고 가족을 만들거나 초대 코드로 참여하세요.
          </p>
        </section>
        <Card className="self-start">
          <h3 className="text-xl font-semibold">시작하기</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
            프로필 이미지는 Google 계정의 photoURL을 사용합니다.
          </p>
          <Button className="mt-5 w-full" onClick={signIn}>
            <GoogleLogo size={20} weight="bold" />
            Google로 로그인
          </Button>
          {authError ? (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
              {authError}
            </p>
          ) : null}
        </Card>
      </div>
    );
  }

  async function handleLoadFamily() {
    if (!user) {
      return;
    }

    setIsSubmitting(true);
    setFeedback("");

    try {
      const result = await getFirstFamilyForUser(user.uid);

      if (!result) {
        notify("아직 참여한 가족이 없습니다.", "info");
        return;
      }

      setActiveFamily(result);
      setMembers(await getFamilyMembers(result.id));
      notify(`${result.name} 가족 정보를 불러왔습니다.`, "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendQuickMessage(member: FamilyMemberProfile, message: string) {
    if (!activeFamily || !user) {
      notify("가족 정보를 먼저 불러와주세요.", "info");
      return;
    }

    setSendingQuickMessageTo(`${member.userId}-${message}`);
    setFeedback("");

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

      notify("가족 전체방으로 빠른 메시지를 보냈습니다.", "success");
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
      notify("가족 정보를 먼저 불러와주세요.", "info");
      return;
    }

    setUpdatingMemberRoleId(member.userId);
    setFeedback("");

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
      notify(`${member.displayName ?? member.nickname}님의 역할을 변경했습니다.`, "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setUpdatingMemberRoleId("");
    }
  }

  async function handleDeleteMember(member: FamilyMemberProfile) {
    if (!activeFamily || !user) {
      notify("가족 정보를 먼저 불러와주세요.", "info");
      return;
    }

    const confirmed = await confirm({
      confirmLabel: "삭제",
      description: `${member.displayName ?? member.nickname}님을 가족에서 삭제합니다. 삭제된 구성원은 초대 코드로 다시 참여해야 합니다.`,
      title: "가족 구성원을 삭제할까요?",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setDeletingMemberId(member.userId);
    setFeedback("");

    try {
      await deleteFamilyMember({
        actorUserId: user.uid,
        familyId: activeFamily.id,
        targetUserId: member.userId,
      });
      setMembers(await getFamilyMembers(activeFamily.id));
      setSelectedManageMemberId("");
      setMemberManageView("ACTIONS");
      notify("가족 구성원을 삭제했습니다.", "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setDeletingMemberId("");
    }
  }

  async function handleEnableNotifications() {
    if (!activeFamily || !user) {
      notify("가족 정보를 먼저 불러와주세요.", "info");
      return;
    }

    const availability = getNotificationAvailability();

    if (availability === "UNSUPPORTED") {
      notify("이 브라우저는 알림을 지원하지 않습니다.", "info");
      return;
    }

    if (availability === "INSECURE_CONTEXT") {
      notify("브라우저 알림은 HTTPS 또는 localhost 환경에서 사용할 수 있습니다.", "info");
      return;
    }

    const permission = await requestNotificationPermission();

    if (permission !== "granted") {
      notify("브라우저 알림 권한이 허용되지 않았습니다.", "info");
      return;
    }

    const sentCount = notifyDashboardReminders({
      events: calendarEvents,
      familyId: activeFamily.id,
      polls,
      userId: user.uid,
    });

    notify(
      sentCount > 0
        ? `오늘 확인할 알림 ${sentCount}개를 보냈습니다.`
        : "알림을 켰습니다. 오늘 일정이나 24시간 내 마감 투표가 생기면 알려드릴게요.",
      "success"
    );
  }

  function notify(message: string, variant: "error" | "info" | "success") {
    setFeedback(message);
    showToast({ message, variant });
  }

  const isFamilyOwner = members.some(
    (member) => member.userId === user?.uid && member.role === "OWNER"
  );
  const selectedLocationMember =
    members.find((member) => member.userId === selectedLocationMemberId) ?? null;
  const selectedLocation = selectedLocationMember
    ? liveLocations[selectedLocationMember.userId]
    : undefined;
  const selectedManageMember =
    members.find((member) => member.userId === selectedManageMemberId) ?? null;

  return (
    <>
    <div className="grid min-w-0 gap-4 overflow-x-hidden lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <section className="min-w-0 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <p className="text-sm font-semibold text-brand">오늘의 가족 상황</p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight">
          모두의 위치와 일정을 한눈에 확인해요
        </h2>
        <div className="mt-4 grid min-w-0 grid-cols-2 gap-2">
          {members.slice(0, 4).map((member) => (
            <div key={member.userId} className="min-w-0 rounded-2xl bg-[var(--color-surface-muted)] p-3">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <strong className="min-w-0 truncate text-sm">{member.displayName ?? member.nickname}</strong>
                <BatteryHigh
                  className={`shrink-0 ${liveLocations[member.userId]?.charging ? "text-brand" : "text-[var(--color-text-secondary)]"}`}
                  size={16}
                />
              </div>
              <p className="mt-2 flex min-w-0 items-center gap-1 text-xs">
                <MapPin className="shrink-0" size={14} weight="fill" />
                <span className="min-w-0 truncate">
                  {liveLocations[member.userId]
                    ? formatLocationPreview(liveLocations[member.userId])
                    : "위치 공유 대기"}
                </span>
              </p>
              <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">
                {liveLocations[member.userId]
                  ? formatUpdatedAt(liveLocations[member.userId].updatedAt)
                  : "앱에서 현재 위치 공유 필요"}
              </p>
            </div>
          ))}
          {members.length === 0 && (
            <div className="col-span-2 rounded-2xl bg-[var(--color-surface-muted)] p-3 text-sm text-[var(--color-text-secondary)]">
              가족을 만들거나 초대 코드로 참여하면 가족 상황이 표시됩니다.
            </div>
          )}
        </div>
      </section>

      <Card>
        <div className="grid gap-3">
          {activeFamily && (
            <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  현재 가족
                </p>
                <strong className="mt-0.5 block truncate">{activeFamily.name}</strong>
              </div>
              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand">
                {activeFamily.inviteCode}
              </span>
            </div>
          )}
          <Input
            label="새 가족 이름"
            onChange={(event) => setFamilyName(event.target.value)}
            placeholder="예: 우리 가족"
            value={familyName}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button disabled={isSubmitting} onClick={handleCreateFamily}>
              <Plus size={18} weight="bold" />
              가족 생성
            </Button>
            <Button disabled={isSubmitting} onClick={handleLoadFamily} variant="secondary">
              <UsersThree size={18} weight="bold" />
              불러오기
            </Button>
          </div>
          <Input
            label="초대 코드"
            onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
            placeholder="예: A1B2C3"
            value={inviteCode}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button disabled={isSubmitting} onClick={handleJoinFamily} variant="secondary">
              <LinkSimple size={18} weight="bold" />
              참여
            </Button>
            <Button disabled={locationShare.isSharing} onClick={locationShare.shareCurrentLocation}>
              <MapPin size={18} weight="bold" />
              위치 공유
            </Button>
          </div>
          <Button onClick={() => void handleEnableNotifications()} variant="secondary">
            <BellRinging size={18} weight="bold" />
            오늘 알림 켜기
          </Button>
          {feedback && (
            <p className="rounded-xl bg-brand-soft p-3 text-sm font-semibold text-emerald-900">
              {feedback}
            </p>
          )}
          {locationShare.message && (
            <p className="rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm font-semibold text-[var(--color-text-secondary)]">
              {locationShare.message}
            </p>
          )}
        </div>
      </Card>

      <div className="grid min-w-0 gap-4 lg:col-span-2 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <MapPin className="text-brand" size={22} weight="bold" />
            <h3 className="text-base font-semibold">가족 위치</h3>
          </div>
          {members.length === 0 ? (
            <p className="mt-4 rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm text-[var(--color-text-secondary)]">
              가족 구성원이 있으면 위치 핀이 표시됩니다.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              <FamilyLocationMap
                locations={liveLocations}
                members={members}
                onSelectMember={setSelectedLocationMemberId}
              />
            </div>
          )}
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <CalendarDots className="text-brand" size={22} weight="bold" />
            <h3 className="text-base font-semibold">이달의 일정</h3>
          </div>
          <DashboardList
            emptyText="이번 달 일정이 없습니다."
            items={getThisMonthEvents(calendarEvents).slice(0, 4).map((event) => ({
              label: event.title,
              meta: formatEventMeta(event),
            }))}
          />
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <Note className="text-brand" size={22} weight="bold" />
            <h3 className="text-base font-semibold">최근 메모와 투표</h3>
          </div>
          <DashboardList
            emptyText="최근 메모나 투표가 없습니다."
            items={[
              ...memos.slice(0, 2).map((memo) => ({
                label: memo.title,
                meta: memo.type === "SENSITIVE" ? "민감 메모" : "일반 메모",
              })),
              ...polls.slice(0, 2).map((poll) => ({
                label: poll.title,
                meta: poll.type === "DATE" ? "날짜 투표" : "일반 투표",
              })),
            ].slice(0, 4)}
          />
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <ChatCircleDots className="text-brand" size={22} weight="bold" />
            <h3 className="text-base font-semibold">최근 채팅</h3>
          </div>
          <DashboardList
            emptyText="최근 채팅이 없습니다."
            items={chatRooms.slice(0, 4).map((room) => ({
              label: room.name,
              meta: room.lastMessageText ?? "아직 대화가 없습니다.",
            }))}
          />
        </Card>
      </div>

      <Card className="lg:col-span-2">
        <div className="flex items-center gap-2">
          <UsersThree className="text-brand" size={22} weight="bold" />
          <h3 className="text-base font-semibold">가족 구성원</h3>
        </div>
        {members.length > 0 ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <div
                className="flex min-w-0 items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-3"
                key={member.userId}
              >
                <Avatar
                  alt={member.displayName ?? member.nickname}
                  src={member.photoURL}
                />
                <div className="min-w-0 flex-1">
                  <strong className="block truncate">
                    {member.displayName ?? member.nickname}
                  </strong>
                  <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                    {roleLabels[member.role]}
                  </p>
                </div>
                {isFamilyOwner && member.role !== "OWNER" ? (
                  <button
                    aria-label={`${member.displayName ?? member.nickname} 관리`}
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-slate-500 transition hover:text-brand"
                    onClick={() => {
                      setSelectedManageMemberId(member.userId);
                      setMemberManageView("ACTIONS");
                    }}
                    type="button"
                  >
                    <DotsThreeVertical size={20} weight="bold" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
            가족을 만들거나 초대 코드로 참여하면 구성원이 표시됩니다.
          </p>
        )}
      </Card>
    </div>
    <BottomSheet
      isOpen={Boolean(selectedLocationMember)}
      onClose={() => setSelectedLocationMemberId("")}
      title={selectedLocationMember?.displayName ?? selectedLocationMember?.nickname ?? "가족 위치"}
    >
      {selectedLocationMember ? (
        <FamilyLocationPin
          location={selectedLocation}
          member={selectedLocationMember}
          onQuickMessage={handleSendQuickMessage}
          sendingMessageKey={sendingQuickMessageTo}
        />
      ) : null}
    </BottomSheet>
    <BottomSheet
      isOpen={Boolean(selectedManageMember)}
      onClose={() => {
        setSelectedManageMemberId("");
        setMemberManageView("ACTIONS");
      }}
      title={
        memberManageView === "ROLE"
          ? "구성원 역할 변경"
          : selectedManageMember?.displayName ?? selectedManageMember?.nickname ?? "구성원 관리"
      }
      titleAction={
        memberManageView === "ROLE" ? (
          <button
            aria-label="구성원 관리로 돌아가기"
            className="grid size-8 shrink-0 place-items-center text-[var(--color-text-secondary)] transition hover:text-brand"
            onClick={() => setMemberManageView("ACTIONS")}
            type="button"
          >
            <CaretLeft size={20} />
          </button>
        ) : null
      }
    >
      {selectedManageMember && memberManageView === "ACTIONS" ? (
        <div className="grid gap-3">
          <MemberSheetProfile member={selectedManageMember} />
          <button
            className="flex h-12 items-center justify-between rounded-2xl bg-[var(--color-surface-muted)] px-4 text-sm font-semibold text-[var(--color-text-primary)] transition hover:text-brand"
            onClick={() => setMemberManageView("ROLE")}
            type="button"
          >
            <span>구성원 역할 변경</span>
            <span className="text-xs text-[var(--color-text-secondary)]">
              {roleLabels[selectedManageMember.role]}
            </span>
          </button>
          <button
            className="flex h-12 items-center justify-between rounded-2xl bg-red-50 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
            disabled={deletingMemberId === selectedManageMember.userId}
            onClick={() => void handleDeleteMember(selectedManageMember)}
            type="button"
          >
            <span>삭제</span>
            <Trash size={18} />
          </button>
        </div>
      ) : null}
      {selectedManageMember && memberManageView === "ROLE" ? (
        <div className="grid gap-3">
          <MemberSheetProfile member={selectedManageMember} />
          <div className="grid gap-2">
            {editableRoleOptions.map((role) => (
              <button
                className={`flex h-12 items-center justify-between rounded-2xl px-4 text-sm font-semibold transition ${
                  selectedManageMember.role === role
                    ? "bg-brand text-white"
                    : "bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] hover:text-brand"
                }`}
                disabled={
                  updatingMemberRoleId === selectedManageMember.userId ||
                  selectedManageMember.role === role
                }
                key={role}
                onClick={() => void handleUpdateMemberRole(selectedManageMember, role)}
                type="button"
              >
                <span>{roleLabels[role]}</span>
                {selectedManageMember.role === role ? (
                  <span className="text-xs">현재 역할</span>
                ) : null}
              </button>
            ))}
          </div>
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
        <p className="mt-1 truncate text-xs font-semibold text-[var(--color-text-secondary)]">
          {roleLabels[member.role]} · {member.email ?? "이메일 없음"}
        </p>
      </div>
    </div>
  );
}

function FamilyLocationMap({
  locations,
  members,
  onSelectMember,
}: {
  locations: Record<string, LiveLocation>;
  members: FamilyMemberProfile[];
  onSelectMember: (memberId: string) => void;
}) {
  const pins = members
    .map((member) => {
      const location = locations[member.userId];

      return location ? { location, member } : null;
    })
    .filter((pin): pin is { location: LiveLocation; member: FamilyMemberProfile } =>
      Boolean(pin)
    );

  if (pins.length === 0) {
    return (
      <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 text-center">
        <div>
          <MapPin className="mx-auto text-slate-400" size={28} weight="bold" />
          <p className="mt-3 text-sm font-semibold text-[var(--color-text-secondary)]">
            현재 위치 공유를 누르면 지도 위에 가족 핀이 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  const bounds = getLocationBounds(pins.map((pin) => pin.location));

  return (
    <div className="relative min-h-[220px] min-w-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-emerald-50">
      <div className="absolute inset-0 opacity-70">
        <div className="absolute left-0 top-1/4 h-px w-full bg-white/80" />
        <div className="absolute left-0 top-1/2 h-px w-full bg-white/80" />
        <div className="absolute left-0 top-3/4 h-px w-full bg-white/80" />
        <div className="absolute left-1/4 top-0 h-full w-px bg-white/80" />
        <div className="absolute left-1/2 top-0 h-full w-px bg-white/80" />
        <div className="absolute left-3/4 top-0 h-full w-px bg-white/80" />
      </div>
      <div className="absolute inset-x-4 top-4 flex min-w-0 items-center justify-between gap-3 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm backdrop-blur">
        <span className="shrink-0">{pins.length}명 위치 공유중</span>
        <span className="min-w-0 truncate text-right">{formatLocationPreview(getLocationCenter(pins.map((pin) => pin.location)))}</span>
      </div>
      {pins.map(({ location, member }) => {
        const position = getLocationPinPosition(location, bounds);

        return (
          <button
            aria-label={`${member.displayName ?? member.nickname} 위치 보기`}
            className="absolute -translate-x-1/2 -translate-y-full"
            key={member.userId}
            onClick={() => onSelectMember(member.userId)}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
            type="button"
          >
            <div className="relative grid w-12 justify-items-center pb-2 transition active:scale-95">
              <div className="absolute bottom-1 size-5 rotate-45 rounded-br bg-brand shadow-md shadow-emerald-900/20" />
              <div className="relative grid size-12 place-items-center overflow-hidden rounded-full bg-brand text-[11px] font-semibold text-white shadow-md shadow-emerald-900/20">
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
            </div>
          </button>
        );
      })}
    </div>
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
          <strong className="min-w-0 max-w-[58%] shrink truncate text-right text-[var(--color-text-secondary)]">
            {item.meta}
          </strong>
        </li>
      ))}
    </ul>
  );
}

function FamilyLocationPin({
  location,
  member,
  onQuickMessage,
  sendingMessageKey,
}: {
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
          {location ? formatLocationPreview(location) : "아직 공유된 위치가 없습니다."}
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

function formatLocationPreview(location: LiveLocation) {
  return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
}

function getLocationPinLabel(member: FamilyMemberProfile) {
  const name = member.displayName ?? member.nickname;

  return name.length > 3 ? name.slice(0, 2) : name;
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

function getLocationCenter(locations: LiveLocation[]): LiveLocation {
  const total = locations.reduce(
    (sum, location) => ({
      latitude: sum.latitude + location.latitude,
      longitude: sum.longitude + location.longitude,
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    accuracy: null,
    battery: null,
    charging: null,
    latitude: total.latitude / locations.length,
    longitude: total.longitude / locations.length,
    updatedAt: Date.now(),
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

  return "처리 중 오류가 발생했습니다.";
}
