import {
  CalendarDots,
  ChartBar,
  ChatCircleDots,
  LockKey,
  ListBullets,
  MagnifyingGlass,
  PaperPlaneTilt,
  PencilSimple,
  SealQuestion,
  Trash,
  User,
  Users,
  UserPlus,
} from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ActionLayer, MobileCreateButton } from "../../components/common/ActionLayer";
import { AnimatedCheckbox } from "../../components/common/AnimatedCheckbox";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { Avatar } from "../../components/common/Avatar";
import { useConfirmDialog } from "../../components/common/confirmDialogContext";
import { Input } from "../../components/common/Input";
import { IconButton } from "../../components/common/IconButton";
import { LoadingState } from "../../components/common/LoadingState";
import { SectionHeading } from "../../components/common/SectionHeading";
import { useChatMemberDrawer } from "../../components/chat/useChatMemberDrawer";
import { SegmentedControl } from "../../components/common/SegmentedControl";
import { useToast } from "../../components/common/toastContext";
import { useAuth } from "../../features/auth/useAuth";
import {
  createPrivateGroupRoom,
  createSecretRoom,
  deleteChatRoom,
  deleteMessage,
  getOrCreateDirectRoom,
  getOrCreateFamilyRoom,
  markRoomMessagesAsRead,
  sendPollMessage,
  sendTextMessage,
  subscribeChatRooms,
  subscribeMessages,
  updateTextMessage,
} from "../../features/chat/services/chatService";
import type { ChatMessage, ChatRoom } from "../../features/chat/types/chatTypes";
import {
  getFamilyMembers,
} from "../../features/family/services/familyService";
import { useFamily } from "../../features/family/useFamily";
import type { FamilyMemberProfile } from "../../features/family/types/familyTypes";
import { DatePollPicker } from "../../features/poll/components/DatePollPicker";
import { PollOptionEditor } from "../../features/poll/components/PollOptionEditor";
import { subscribePolls } from "../../features/poll/services/pollService";
import { createPoll } from "../../features/poll/services/pollService";
import type { Poll, PollType } from "../../features/poll/types/pollTypes";
import {
  getNormalizedPollOptions,
  hasDuplicatePollOptions,
} from "../../features/poll/utils/pollDraft";

type ChatRoomFilter = "ALL" | "DIRECT" | "PRIVATE_GROUP" | "FAMILY";
type ChatCreateTab = "SECRET" | "GROUP";

const chatRoomFilters: { label: string; value: ChatRoomFilter }[] = [
  { label: "전체", value: "ALL" },
  { label: "크루", value: "FAMILY" },
  { label: "1:1", value: "DIRECT" },
  { label: "비밀방", value: "PRIVATE_GROUP" },
];

export function ChatPage() {
  const { user } = useAuth();
  const { activeFamily, isLoading: isFamilyLoading } = useFamily();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { open: openChatMembers, setRoom: setMemberDrawerRoom } = useChatMemberDrawer();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(0);
  const previousMessageRoomIdRef = useRef("");
  const shouldScrollToLatestRef = useRef(false);
  const [members, setMembers] = useState<FamilyMemberProfile[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [messageText, setMessageText] = useState("");
  const [privateGroupMemberIds, setPrivateGroupMemberIds] = useState<string[]>([]);
  const [secretRoomMemberIds, setSecretRoomMemberIds] = useState<string[]>([]);
  const [privateGroupName, setPrivateGroupName] = useState("");
  const [secretRoomName, setSecretRoomName] = useState("");
  const [chatCreateTab, setChatCreateTab] = useState<ChatCreateTab>("GROUP");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPollCreateOpen, setIsPollCreateOpen] = useState(false);
  const [isRoomSearchOpen, setIsRoomSearchOpen] = useState(false);
  const [roomFilter, setRoomFilter] = useState<ChatRoomFilter>("ALL");
  const [roomQuery, setRoomQuery] = useState("");
  const [busyMessageId, setBusyMessageId] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editingMessageText, setEditingMessageText] = useState("");
  const [pollTitle, setPollTitle] = useState("");
  const [pollDescription, setPollDescription] = useState("");
  const [pollType, setPollType] = useState<PollType>("GENERAL");
  const [pollMultipleChoice, setPollMultipleChoice] = useState(false);
  const [pollOptions, setPollOptions] = useState(["치킨", "피자", "삼겹살"]);
  const [pollDateOptions, setPollDateOptions] = useState<string[]>([]);
  const [pollDateViewDate, setPollDateViewDate] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const reportError = useCallback(
    (message: string) => showToast({ message, variant: "error" }),
    [showToast]
  );
  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === (roomId ?? selectedRoomId)) ?? (!roomId ? rooms[0] : undefined),
    [roomId, rooms, selectedRoomId]
  );

  useEffect(() => {
    setMemberDrawerRoom(selectedRoom ?? null);
  }, [selectedRoom, setMemberDrawerRoom]);

  useEffect(() => () => setMemberDrawerRoom(null), [setMemberDrawerRoom]);
  const visibleRooms = useMemo(() => {
    const normalizedQuery = roomQuery.trim().toLocaleLowerCase();

    return rooms.filter((room) => {
      if (roomFilter !== "ALL" && room.type !== roomFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableText = `${getRoomDisplayName(room, members, user?.uid)} ${
        room.lastMessageText ?? ""
      }`.toLocaleLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [members, roomFilter, roomQuery, rooms, user?.uid]);
  const normalizedPollOptions = getNormalizedPollOptions(pollOptions);
  const hasDuplicatePollDraftOptions = hasDuplicatePollOptions(pollOptions);
  const canCreateRoomPoll =
    Boolean(selectedRoom) &&
    pollTitle.trim().length > 0 &&
    (pollType === "DATE"
      ? pollDateOptions.length >= 2
      : normalizedPollOptions.length >= 2 && !hasDuplicatePollDraftOptions);
  const pollMap = useMemo(
    () => new Map(polls.map((poll) => [poll.id, poll])),
    [polls]
  );

  function toggleSecretRoomMember(memberId: string) {
    setSecretRoomMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((selectedMemberId) => selectedMemberId !== memberId)
        : [...current, memberId]
    );
  }

  useEffect(() => {
    if (!activeFamily || !user) {
      return;
    }

    let active = true;
    const userId = user.uid;

    queueMicrotask(() => {
      if (!active) {
        return;
      }

      setRooms([]);
      setMessages([]);
      setMembers([]);
      setPolls([]);
      setSelectedRoomId("");
    });
    Promise.allSettled([
      getOrCreateFamilyRoom({
        createdBy: userId,
        familyId: activeFamily.id,
      }),
      getFamilyMembers(activeFamily.id),
    ]).then(([familyRoomResult, membersResult]) => {
      if (!active) {
        return;
      }

      if (membersResult.status === "fulfilled") {
        setMembers(membersResult.value);
      } else {
        reportError(getErrorMessage(membersResult.reason));
      }

      if (familyRoomResult.status === "fulfilled") {
        setSelectedRoomId(familyRoomResult.value);
      } else {
        reportError(
          `전체 채팅방을 확인하지 못했어요. ${getErrorMessage(familyRoomResult.reason)}`
        );
      }
    });

    return () => {
      active = false;
    };
  }, [activeFamily, reportError, user]);

  function openRoom(nextRoomId: string) {
    setSelectedRoomId(nextRoomId);
    const nextRoom = rooms.find((room) => room.id === nextRoomId);
    const chatRoomName = nextRoom
      ? getRoomDisplayName(nextRoom, members, user?.uid)
      : "채팅방";

    if (!window.matchMedia("(min-width: 1024px)").matches) {
      navigate(`/chat/${nextRoomId}`, { state: { chatRoomName } });
    }
  }

  async function handleCreateDirectRoom(member: FamilyMemberProfile) {
    if (!activeFamily || !user) {
      return;
    }

    try {
      const roomId = await getOrCreateDirectRoom({
        createdBy: user.uid,
        familyId: activeFamily.id,
        targetUserId: member.userId,
        targetUserName: member.displayName ?? member.nickname,
      });

      setSelectedRoomId(roomId);
      openRoom(roomId);
      notify("1:1 채팅을 열었어요.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "1:1 채팅을 열지 못했어요.", "error");
    }
  }

  async function handleCreatePrivateGroupRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeFamily || !user) {
      return;
    }

    try {
      const roomId = await createPrivateGroupRoom({
        createdBy: user.uid,
        familyId: activeFamily.id,
        memberIds: privateGroupMemberIds,
        name: privateGroupName,
      });

      setPrivateGroupName("");
      setPrivateGroupMemberIds([]);
      setSelectedRoomId(roomId);
      openRoom(roomId);
      setIsCreateOpen(false);
      notify("크루 채팅방을 만들었어요.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "크루 채팅방을 만들지 못했어요.", "error");
    }
  }

  function togglePrivateGroupMember(memberId: string) {
    setPrivateGroupMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((selectedMemberId) => selectedMemberId !== memberId)
        : [...current, memberId]
    );
  }

  function toggleAllPrivateGroupMembers() {
    const selectableMemberIds = members
      .filter((member) => member.userId !== user?.uid)
      .map((member) => member.userId);

    setPrivateGroupMemberIds((current) =>
      current.length === selectableMemberIds.length ? [] : selectableMemberIds
    );
  }

  useEffect(() => {
    if (!activeFamily || !user) {
      return;
    }

    return subscribeChatRooms({
      familyId: activeFamily.id,
      onChange: setRooms,
      onError: reportError,
      userId: user.uid,
    });
  }, [activeFamily, reportError, user]);

  useEffect(() => {
    if (!activeFamily) {
      return;
    }

    return subscribePolls({
      familyId: activeFamily.id,
      onChange: setPolls,
      onError: reportError,
    });
  }, [activeFamily, reportError]);

  useEffect(() => {
    if (!activeFamily || !selectedRoom) {
      return;
    }

    return subscribeMessages({
      familyId: activeFamily.id,
      onChange: setMessages,
      onError: reportError,
      roomId: selectedRoom.id,
    });
  }, [activeFamily, reportError, selectedRoom]);

  useEffect(() => {
    const container = messagesScrollRef.current;
    const roomKey = selectedRoom?.id ?? "";

    if (!container || !roomKey) {
      previousMessageRoomIdRef.current = "";
      previousMessageCountRef.current = 0;
      return;
    }

    if (messages.length === 0) {
      return;
    }

    const isNewRoom = previousMessageRoomIdRef.current !== roomKey;
    const hasNewMessage = messages.length > previousMessageCountRef.current;
    const shouldForceScroll = shouldScrollToLatestRef.current;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceFromBottom <= 144;

    if (isNewRoom || shouldForceScroll || (hasNewMessage && isNearBottom)) {
      shouldScrollToLatestRef.current = false;
      const frameId = window.requestAnimationFrame(() => {
        container.scrollTo({
          behavior: isNewRoom ? "auto" : "smooth",
          top: container.scrollHeight,
        });
      });

      previousMessageRoomIdRef.current = roomKey;
      previousMessageCountRef.current = messages.length;

      return () => window.cancelAnimationFrame(frameId);
    }

    previousMessageRoomIdRef.current = roomKey;
    previousMessageCountRef.current = messages.length;
  }, [messages.length, selectedRoom?.id]);

  useEffect(() => {
    if (!activeFamily || !user || messages.length === 0) {
      return;
    }

    void markRoomMessagesAsRead({
      familyId: activeFamily.id,
      messages,
      userId: user.uid,
    }).catch((error: Error) => reportError(error.message));
  }, [activeFamily, messages, reportError, user]);

  async function handleCreateSecretRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeFamily || !user) {
      return;
    }

    try {
      const roomId = await createSecretRoom({
        createdBy: user.uid,
        familyId: activeFamily.id,
        memberIds: secretRoomMemberIds,
        name: secretRoomName,
      });
      setSecretRoomName("");
      setSecretRoomMemberIds([]);
      setSelectedRoomId(roomId);
      openRoom(roomId);
      setIsCreateOpen(false);
      notify("비밀방을 만들었어요.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "비밀방을 만들지 못했어요.", "error");
    }
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeFamily || !selectedRoom || !user) {
      return;
    }

    try {
      shouldScrollToLatestRef.current = true;
      await sendTextMessage({
        createdBy: user.uid,
        familyId: activeFamily.id,
        roomId: selectedRoom.id,
        text: messageText,
      });
      setMessageText("");
    } catch (error) {
      shouldScrollToLatestRef.current = false;
      notify(error instanceof Error ? error.message : "메시지를 보내지 못했어요.", "error");
    }
  }

  function handleEditMessage(message: ChatMessage) {
    if (message.type !== "TEXT") {
      return;
    }

    setEditingMessageId(message.id);
    setEditingMessageText(message.text);
  }

  async function handleSubmitMessageEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeFamily || !editingMessageId) {
      return;
    }

    const nextText = editingMessageText.trim();

    if (!nextText) {
      notify("수정할 메시지를 적어주세요.", "info");
      return;
    }

    try {
      await updateTextMessage({
        familyId: activeFamily.id,
        messageId: editingMessageId,
        text: nextText,
      });
      setEditingMessageId("");
      setEditingMessageText("");
      notify("메시지를 바꿨어요.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "메시지를 바꾸지 못했어요.", "error");
    }
  }

  async function handleDeleteMessage(message: ChatMessage) {
    if (!activeFamily) {
      return;
    }

    const confirmed = await confirm({
      confirmLabel: "삭제",
      description: "선택한 메시지를 삭제해요. 되돌릴 수 없어요.",
      title: "메시지를 삭제할까요?",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setBusyMessageId(message.id);

    try {
      await deleteMessage({
        familyId: activeFamily.id,
        messageId: message.id,
      });
      notify("메시지를 삭제했어요.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "메시지를 삭제하지 못했어요.", "error");
    } finally {
      setBusyMessageId("");
    }
  }

  async function handleCreatePollInRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeFamily || !selectedRoom || !user) {
      notify("채팅방을 먼저 골라주세요.", "info");
      return;
    }

    try {
      shouldScrollToLatestRef.current = true;
      const pollId = await createPoll({
        createdBy: user.uid,
        description: pollDescription,
        familyId: activeFamily.id,
        multipleChoice: pollType === "DATE" ? false : pollMultipleChoice,
        options: pollType === "DATE" ? pollDateOptions : pollOptions,
        title: pollTitle,
        type: pollType,
      });

      await sendPollMessage({
        createdBy: user.uid,
        familyId: activeFamily.id,
        pollId,
        pollTitle,
        roomId: selectedRoom.id,
      });

      setPollTitle("");
      setPollDescription("");
      setPollType("GENERAL");
      setPollMultipleChoice(false);
      setPollOptions(["치킨", "피자", "삼겹살"]);
      setPollDateOptions([]);
      setIsPollCreateOpen(false);
      notify("투표를 만들어 채팅방에 보냈어요.", "success");
    } catch (error) {
      shouldScrollToLatestRef.current = false;
      notify(error instanceof Error ? error.message : "투표를 만들지 못했어요.", "error");
    }
  }

  async function handleDeleteRoom(room: ChatRoom) {
    if (!activeFamily || !user || room.type === "FAMILY") {
      return;
    }

    const confirmed = await confirm({
      confirmLabel: "삭제",
      description: `'${getRoomDisplayName(room, members, user.uid)}' 채팅방을 삭제합니다.`,
      title: "채팅방을 삭제할까요?",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteChatRoom({
        familyId: activeFamily.id,
        roomId: room.id,
      });
      if (selectedRoomId === room.id || roomId === room.id) {
        setSelectedRoomId("");
        navigate("/chat");
        setMessages([]);
      }
      notify("채팅방을 삭제했어요.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "채팅방을 삭제하지 못했어요.", "error");
    }
  }

  function notify(message: string, variant: "error" | "info" | "success") {
    showToast({ message, variant });
  }

  function addPollOption() {
    setPollOptions((current) => [...current, ""]);
  }

  function removePollOption(index: number) {
    setPollOptions((current) =>
      current.length <= 2 ? current : current.filter((_, optionIndex) => optionIndex !== index)
    );
  }

  function updatePollOption(index: number, value: string) {
    setPollOptions((current) =>
      current.map((option, optionIndex) => (optionIndex === index ? value : option))
    );
  }

  function togglePollDateOption(dateValue: string) {
    setPollDateOptions((current) =>
      current.includes(dateValue)
        ? current.filter((selectedDate) => selectedDate !== dateValue)
        : [...current, dateValue].sort()
    );
  }

  if (isFamilyLoading) {
    return <LoadingState title="채팅을 불러오는 중이에요." />;
  }

  if (!activeFamily) {
    return (
      <Card>
        <h2 className="text-xl font-semibold">채팅</h2>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          홈에서 크루를 만들거나 초대 코드로 참여하면 채팅방을 사용할 수 있어요.
        </p>
      </Card>
    );
  }

  const selectablePrivateGroupMemberIds = members
    .filter((member) => member.userId !== user?.uid)
    .map((member) => member.userId);
  const allPrivateGroupMembersSelected =
    selectablePrivateGroupMemberIds.length > 0 &&
    selectablePrivateGroupMemberIds.every((memberId) => privateGroupMemberIds.includes(memberId));

  const chatCreateTools = (
    <div className="mx-auto grid w-full max-w-xl gap-4">
      <SegmentedControl
        onChange={setChatCreateTab}
        options={[
          { icon: <LockKey size={16} weight="bold" />, label: "비밀방", value: "SECRET" },
          { icon: <Users size={16} weight="bold" />, label: "크루 채팅방", value: "GROUP" },
        ]}
        value={chatCreateTab}
      />

      {chatCreateTab === "SECRET" ? (
        <form className="grid gap-3" onSubmit={handleCreateSecretRoom}>
          <SectionHeading
            description="초대된 멤버만 참여할 수 있어요."
            icon={<LockKey size={20} weight="bold" />}
            level="h3"
            title="비밀방 만들기"
          />
          <Input
            label="방 이름"
            onChange={(event) => setSecretRoomName(event.target.value)}
            placeholder="예: 선물 작전방"
            value={secretRoomName}
          />
          <MemberSelectionList
            currentUserId={user?.uid}
            members={members}
            onToggle={toggleSecretRoomMember}
            selectedMemberIds={secretRoomMemberIds}
          />
          <Button
            disabled={
              members.filter((member) => member.userId !== user?.uid).length === 0 ||
              secretRoomMemberIds.length === 0
            }
            type="submit"
            variant="secondary"
          >
            <LockKey size={18} weight="bold" />
            비밀방 만들기
          </Button>
        </form>
      ) : (
        <form className="grid gap-3" onSubmit={handleCreatePrivateGroupRoom}>
          <SectionHeading
            description="선택한 멤버와 함께 사용할 방을 만들어요."
            icon={<Users size={20} weight="bold" />}
            level="h3"
            title="크루 채팅방 만들기"
          />
          <Input
            label="방 이름"
            onChange={(event) => setPrivateGroupName(event.target.value)}
            placeholder="예: 주말 준비방"
            value={privateGroupName}
          />
          <label className="flex cursor-pointer items-center gap-2 self-start text-sm font-semibold text-[var(--color-text-secondary)]">
            <AnimatedCheckbox
              checked={allPrivateGroupMembersSelected}
              onChange={() => toggleAllPrivateGroupMembers()}
            />
            <span>전체 선택</span>
          </label>
          <MemberSelectionList
            currentUserId={user?.uid}
            members={members}
            onToggle={togglePrivateGroupMember}
            selectedMemberIds={privateGroupMemberIds}
          />
          <Button
            disabled={
              members.filter((member) => member.userId !== user?.uid).length === 0 ||
              privateGroupMemberIds.length === 0
            }
            type="submit"
            variant="secondary"
          >
            <Users size={18} weight="bold" />
            크루 채팅방 만들기
          </Button>
        </form>
      )}
    </div>
  );

  return (
    <>
      <ActionLayer isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="채팅방 만들기"
      >
        {chatCreateTools}
      </ActionLayer>
      {!roomId ? (
        <MobileCreateButton
          label="+ 채팅방"
          onClick={() => setIsCreateOpen(true)}
        />
      ) : null}
      <ActionLayer
        desktop
        isOpen={isPollCreateOpen}
        onClose={() => setIsPollCreateOpen(false)}
        title="투표 만들기"
      >
        <form className="grid gap-4" onSubmit={handleCreatePollInRoom}>
          <Input
            label="투표 제목"
            onChange={(event) => setPollTitle(event.target.value)}
            placeholder="예: 이번 주말 뭐 먹을까?"
            value={pollTitle}
          />
          <Input
            label="설명"
            onChange={(event) => setPollDescription(event.target.value)}
            placeholder="선택 사항"
            value={pollDescription}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                pollType === "GENERAL"
                  ? "bg-brand text-white"
                  : "border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)]"
              }`}
              onClick={() => setPollType("GENERAL")}
              type="button"
            >
              <ChartBar size={17} weight="bold" />
              일반
            </button>
            <button
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                pollType === "DATE"
                  ? "bg-brand text-white"
                  : "border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)]"
              }`}
              onClick={() => {
                setPollType("DATE");
                setPollMultipleChoice(false);
              }}
              type="button"
            >
              <CalendarDots size={17} weight="bold" />
              날짜
            </button>
          </div>
          {pollType === "DATE" ? (
            <DatePollPicker
              selectedDates={pollDateOptions}
              setViewDate={setPollDateViewDate}
              toggleDate={togglePollDateOption}
              viewDate={pollDateViewDate}
            />
          ) : (
            <PollOptionEditor
              onAdd={addPollOption}
              onRemove={removePollOption}
              onUpdate={updatePollOption}
              options={pollOptions}
            />
          )}
          {pollType === "GENERAL" ? (
            <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-4 text-sm font-semibold">
              <AnimatedCheckbox
                checked={pollMultipleChoice}
                onChange={(event) => setPollMultipleChoice(event.target.checked)}
              />
              복수 선택 허용
            </label>
          ) : (
            <p className="rounded-2xl bg-[var(--color-surface-muted)] p-4 text-sm leading-5 text-[var(--color-text-secondary)]">
              날짜 투표는 하나의 날짜만 선택할 수 있게 생성됩니다.
            </p>
          )}
          <Button disabled={!canCreateRoomPoll} type="submit">
            <SealQuestion size={18} />
            투표 만들고 전송
          </Button>
          {!canCreateRoomPoll ? (
            <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
              {pollType === "GENERAL" && hasDuplicatePollDraftOptions
                ? "같은 선택지는 사용할 수 없어요."
                : `제목과 후보 ${pollType === "DATE" ? "날짜" : "항목"} 2개 이상이 필요합니다.`}
            </p>
          ) : null}
        </form>
      </ActionLayer>
      <ActionLayer
        desktop
        isOpen={Boolean(editingMessageId)}
        onClose={() => {
          setEditingMessageId("");
          setEditingMessageText("");
        }}
        title="메시지 수정"
      >
        <form className="grid gap-4" onSubmit={handleSubmitMessageEdit}>
          <label className="grid gap-2 text-sm font-semibold">
            메시지
            <textarea
              autoFocus
              className="min-h-28 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base font-normal text-[var(--color-text-primary)] outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-emerald-100"
              inputMode="text"
              lang="ko"
              onChange={(event) => setEditingMessageText(event.target.value)}
              value={editingMessageText}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => {
                setEditingMessageId("");
                setEditingMessageText("");
              }}
              type="button"
              variant="secondary"
            >
              취소
            </Button>
            <Button type="submit">수정 완료</Button>
          </div>
        </form>
      </ActionLayer>

    <div className="grid w-full min-w-0 max-w-full gap-4 lg:h-[calc(100dvh-112px)] lg:min-h-0 lg:items-start lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <div
        className={`${roomId ? "hidden lg:grid" : "grid"} min-w-0 content-start gap-4 overscroll-contain lg:max-h-[calc(100dvh-112px)] lg:overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
      <Card className="min-w-0 self-start">
        <SectionHeading
          action={
            <div className="flex items-center gap-1">
              <IconButton
                label="채팅방 검색"
                onClick={() => setIsRoomSearchOpen((current) => !current)}
                variant="ghost"
              >
                <MagnifyingGlass size={21} />
              </IconButton>
            </div>
          }
          icon={<ChatCircleDots size={20} weight="bold" />}
          title="진행 중인 채팅"
        />
        {isRoomSearchOpen ? (
          <label className="mt-3 flex h-11 items-center gap-2 rounded-xl bg-[var(--color-surface-muted)] px-3">
            <MagnifyingGlass className="shrink-0 text-[var(--color-text-secondary)]" size={18} />
            <span className="sr-only">채팅방 검색</span>
            <input
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-slate-400"
              inputMode="search"
              lang="ko"
              onChange={(event) => setRoomQuery(event.target.value)}
              placeholder="채팅방 검색"
              value={roomQuery}
            />
          </label>
        ) : null}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chatRoomFilters.map((filter) => (
            <button
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                roomFilter === filter.value
                  ? "bg-[var(--color-text-primary)] text-[var(--color-surface)]"
                  : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
              key={filter.value}
              onClick={() => setRoomFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="mt-6">
          <SectionHeading icon={<User size={20} weight="bold" />} level="h3" title="1:1 대화" />
          <div className="mt-3 grid gap-1">
            {members.filter((member) => member.userId !== user?.uid).length === 0 ? (
              <p className="rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm text-[var(--color-text-secondary)]">
                다른 크루 멤버가 참여하면 1:1 대화를 시작할 수 있어요.
              </p>
            ) : (
              members
                .filter((member) => member.userId !== user?.uid)
                .map((member) => (
                  <button
                    className="flex w-full min-w-0 items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-[var(--color-surface-muted)]"
                    key={member.userId}
                    onClick={() => void handleCreateDirectRoom(member)}
                    type="button"
                  >
                    <Avatar
                      alt={member.displayName ?? member.nickname}
                      className="size-9 shrink-0 text-sm"
                      src={member.photoURL}
                    />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm">
                        {member.displayName ?? member.nickname}
                      </strong>
                    </span>
                    <ChatCircleDots className="shrink-0 text-[var(--color-text-secondary)]" size={18} />
                  </button>
                ))
            )}
          </div>
        </div>

        <div className="mt-6">
          <SectionHeading icon={<ChatCircleDots size={20} weight="bold" />} level="h3" title="채팅방" />
          <div className="mt-3 grid gap-1">
            {visibleRooms.length === 0 ? (
              <p className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-secondary)]">
                {roomQuery || roomFilter !== "ALL"
                  ? "조건에 맞는 채팅방이 없어요."
                  : "아직 채팅방이 없어요."}
              </p>
            ) : (
              visibleRooms.map((room) => (
                <div
                    className={`flex min-w-0 items-center gap-3 rounded-xl px-2 py-2.5 transition ${
                      selectedRoom?.id === room.id
                        ? "bg-brand-soft text-brand"
                        : "hover:bg-[var(--color-surface-muted)]"
                  }`}
                  key={room.id}
                >
                  <button
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => openRoom(room.id)}
                    type="button"
                  >
                    <RoomAvatar currentUserId={user?.uid} members={members} room={room} />
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center justify-between gap-3">
                        <strong className="min-w-0 truncate text-sm">
                          {getRoomDisplayName(room, members, user?.uid)}
                        </strong>
                        {formatRoomTime(room.lastMessageAt) ? (
                          <time className="shrink-0 text-[11px] text-[var(--color-text-secondary)]">
                            {formatRoomTime(room.lastMessageAt)}
                          </time>
                        ) : null}
                      </span>
                      <span className="mt-1 block truncate text-xs text-[var(--color-text-secondary)]">
                        {room.lastMessageText ?? `${getRoomTypeLabel(room)} 채팅방`}
                      </span>
                    </span>
                  </button>
                  {room.type !== "FAMILY" && room.createdBy === user?.uid ? (
                    <IconButton
                      className="size-8 shrink-0"
                      label="채팅방 삭제"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteRoom(room);
                      }}
                      variant="ghost"
                    >
                      <Trash size={17} />
                    </IconButton>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

      </Card>

      <Card className="hidden min-w-0 lg:block">
        <div>
          <SectionHeading
            icon={<UserPlus size={20} weight="bold" />}
            level="h3"
            title="채팅방 만들기"
          />
          <div className="mt-4">{chatCreateTools}</div>
        </div>
      </Card>
      </div>

      <section className={`${roomId ? "fixed inset-x-0 bottom-0 top-16 z-10 flex" : "hidden lg:flex"} mx-0 min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--color-background)] lg:static lg:inset-auto lg:z-auto lg:mx-0 lg:h-full lg:rounded-card lg:border lg:border-[var(--color-border)] lg:bg-[var(--color-surface)] lg:p-4 lg:shadow-sm`}>
        <div className="hidden min-w-0 shrink-0 items-center justify-between gap-3 lg:flex">
          <div className="flex min-w-0 items-center gap-2">
            {selectedRoom ? (
              <button
                aria-label="참여 멤버 보기"
                className="grid size-8 shrink-0 place-items-center text-[var(--color-text-secondary)] transition hover:text-brand"
                onClick={openChatMembers}
                title="참여 멤버 보기"
                type="button"
              >
                <ListBullets size={20} weight="regular" />
              </button>
            ) : null}
            <h3 className="min-w-0 truncate text-lg font-semibold">
              {selectedRoom ? getRoomDisplayName(selectedRoom, members, user?.uid) : "채팅방"}
            </h3>
          </div>
        </div>
        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-4 pt-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6 lg:mt-4 lg:min-h-0 lg:rounded-2xl lg:bg-slate-50 lg:p-4"
          ref={messagesScrollRef}
        >
          <div className="mt-auto grid gap-3">
            {messages.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                첫 메시지를 보내 크루 대화를 시작해보세요.
              </p>
            ) : (
              messages.map((message) => {
                const isMine = message.createdBy === user?.uid;
                const readCount = message.readBy.length;

                return (
                  <div
                    className={`grid gap-1 ${isMine ? "justify-items-end" : "justify-items-start"}`}
                    key={message.id}
                  >
                    <MessageRow
                      isBusy={busyMessageId === message.id || editingMessageId === message.id}
                      isMine={isMine}
                      member={members.find((member) => member.userId === message.createdBy)}
                      message={message}
                      onDelete={handleDeleteMessage}
                      onEdit={handleEditMessage}
                      poll={message.pollId ? pollMap.get(message.pollId) : undefined}
                      readLabel={
                        isMine
                          ? `읽음 ${readCount}명`
                          : message.readBy.includes(user?.uid ?? "")
                            ? "읽음"
                            : "안 읽음"
                      }
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
        <form className="flex shrink-0 min-w-0 gap-2 border-t border-white/70 bg-white/85 px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)] shadow-[0_-12px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-6 lg:mt-4 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none" onSubmit={handleSendMessage}>
          <input
            autoComplete="off"
            className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[var(--color-text-primary)] outline-none focus:border-brand"
            enterKeyHint="send"
            inputMode="text"
            lang="ko"
            onChange={(event) => setMessageText(event.target.value)}
            placeholder="메시지 입력"
            type="text"
            value={messageText}
          />
          <button
            aria-label="투표 만들기"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] transition-[background-color,color,transform] duration-200 active:scale-90 hover:bg-[var(--color-surface-muted)] hover:text-brand"
            onClick={() => setIsPollCreateOpen(true)}
            type="button"
          >
            <SealQuestion size={21} />
          </button>
          <button
            aria-label="전송"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white transition-[background-color,transform] duration-200 active:scale-90 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedRoom}
            type="submit"
          >
            <PaperPlaneTilt size={21} />
          </button>
        </form>
      </section>
    </div>
    </>
  );
}

function getRoomTypeLabel(room: ChatRoom) {
  if (room.type === "DIRECT") {
    return "1:1";
  }

  if (room.type === "PRIVATE_GROUP") {
    return "크루";
  }

  return "크루";
}

function getRoomDisplayName(
  room: ChatRoom,
  members: FamilyMemberProfile[],
  currentUserId: string | undefined
) {
  if (room.type !== "DIRECT") {
    return room.name;
  }

  const targetUserId = room.memberIds.find((memberId) => memberId !== currentUserId);
  const targetMember = members.find((member) => member.userId === targetUserId);

  return targetMember
    ? `${targetMember.displayName ?? targetMember.nickname}님과의 대화`
    : room.name;
}

function RoomAvatar({
  currentUserId,
  members,
  room,
}: {
  currentUserId: string | undefined;
  members: FamilyMemberProfile[];
  room: ChatRoom;
}) {
  const targetUserId = room.memberIds.find((memberId) => memberId !== currentUserId);
  const targetMember = members.find((member) => member.userId === targetUserId);
  const roomMember =
    targetMember ?? members.find((member) => room.memberIds.includes(member.userId)) ?? members[0];

  if (roomMember) {
    return (
      <Avatar
        alt={roomMember.displayName ?? roomMember.nickname}
        className="size-9 shrink-0"
        src={roomMember.photoURL}
      />
    );
  }

  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand ring-1 ring-inset ring-black/[0.04]">
      {room.type === "DIRECT" ? (
        <User size={20} weight="fill" />
      ) : room.type === "PRIVATE_GROUP" ? (
        <LockKey size={19} weight="fill" />
      ) : (
        <Users size={20} weight="fill" />
      )}
    </span>
  );
}

function MemberSelectionList({
  currentUserId,
  members,
  onToggle,
  selectedMemberIds,
}: {
  currentUserId?: string;
  members: FamilyMemberProfile[];
  onToggle: (memberId: string) => void;
  selectedMemberIds: string[];
}) {
  const selectableMembers = members.filter((member) => member.userId !== currentUserId);

  if (selectableMembers.length === 0) {
    return (
      <p className="rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm text-[var(--color-text-secondary)]">
        함께할 멤버가 없어요.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
        함께할 멤버 선택
      </p>
      {selectableMembers.map((member) => (
        <label
          className="flex cursor-pointer items-center gap-3 rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm font-semibold transition hover:bg-brand-soft/60"
          key={member.userId}
        >
          <Avatar
            alt={member.displayName ?? member.nickname}
            src={member.photoURL}
          />
          <span className="min-w-0 flex-1 truncate">
            {member.displayName ?? member.nickname}
          </span>
          <AnimatedCheckbox
            checked={selectedMemberIds.includes(member.userId)}
            onChange={() => onToggle(member.userId)}
          />
        </label>
      ))}
    </div>
  );
}

function formatRoomTime(value: unknown) {
  const milliseconds = getTimestampMilliseconds(value);

  if (!milliseconds) {
    return "";
  }

  const date = new Date(milliseconds);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "numeric",
  }).format(date);
}

function getTimestampMilliseconds(value: unknown) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  if (value && typeof value === "object") {
    if ("toMillis" in value && typeof value.toMillis === "function") {
      return value.toMillis();
    }

    if ("seconds" in value && typeof value.seconds === "number") {
      return value.seconds * 1000;
    }
  }

  return 0;
}

function MessageRow({
  isBusy,
  isMine,
  member,
  message,
  onDelete,
  onEdit,
  poll,
  readLabel,
}: {
  isBusy: boolean;
  isMine: boolean;
  member: FamilyMemberProfile | undefined;
  message: ChatMessage;
  onDelete: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  poll: Poll | undefined;
  readLabel: string;
}) {
  return (
    <div className={`flex w-full min-w-0 gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
      {!isMine ? (
        <Avatar
          alt={member?.displayName ?? member?.nickname ?? "크루 멤버"}
          className="size-8 shrink-0 bg-white text-xs shadow-sm"
          src={member?.photoURL}
        />
      ) : null}
      <div className={`min-w-0 max-w-[78%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {!isMine ? (
          <span className="px-1 text-xs font-normal text-[var(--color-text-secondary)]">
            {member?.displayName ?? member?.nickname ?? "크루 멤버"}
          </span>
        ) : null}
        <div className={`group flex items-end gap-1 ${isMine ? "flex-row-reverse" : ""}`}>
          {message.type === "POLL" ? (
            <PollMessageCard
              isMine={isMine}
              message={message}
              poll={poll}
            />
          ) : (
            <p
              className={`relative break-words px-4 py-3 text-sm font-normal leading-6 shadow-sm ${
                isMine
                  ? "rounded-2xl rounded-br-md bg-brand text-white after:absolute after:bottom-2 after:-right-1 after:size-3 after:rotate-45 after:bg-brand"
                  : "rounded-2xl rounded-bl-md bg-white text-[var(--color-text-primary)] after:absolute after:bottom-2 after:-left-1 after:size-3 after:rotate-45 after:bg-white"
              }`}
            >
              {message.text}
            </p>
          )}
          {isMine && message.type === "TEXT" ? (
            <div className="flex shrink-0 items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
              <button
                aria-label="메시지 수정"
                className="grid size-7 place-items-center rounded-full bg-white/80 text-slate-500 shadow-sm transition hover:text-brand disabled:opacity-40"
                disabled={isBusy}
                onClick={() => onEdit(message)}
                type="button"
              >
                <PencilSimple size={15} />
              </button>
              <button
                aria-label="메시지 삭제"
                className="grid size-7 place-items-center rounded-full bg-white/80 text-slate-500 shadow-sm transition hover:text-red-500 disabled:opacity-40"
                disabled={isBusy}
                onClick={() => onDelete(message)}
                type="button"
              >
                <Trash size={15} />
              </button>
            </div>
          ) : null}
        </div>
        <span className="px-2 text-[11px] font-normal text-[var(--color-text-secondary)]">
          {readLabel}
          {message.updatedAt ? " · 수정됨" : ""}
        </span>
      </div>
    </div>
  );
}

function PollMessageCard({
  isMine,
  message,
  poll,
}: {
  isMine: boolean;
  message: ChatMessage;
  poll: Poll | undefined;
}) {
  return (
    <div
      className={`w-full max-w-[320px] rounded-2xl p-4 text-sm shadow-sm ${
        isMine ? "bg-brand text-white" : "bg-white"
      }`}
    >
      <p className="text-xs font-semibold opacity-80">채팅방 투표</p>
      <strong className="mt-1 block">{poll?.title ?? message.text.replace("투표: ", "")}</strong>
      <p className={`mt-2 text-xs ${isMine ? "text-emerald-50" : "text-[var(--color-text-secondary)]"}`}>
        {poll ? `${poll.options.length}개 보기 · ${poll.multipleChoice ? "복수 선택" : "단일 선택"}` : "투표 메뉴에서 확인"}
      </p>
      <Link
        className={`mt-3 inline-flex h-9 items-center rounded-xl px-3 text-xs font-semibold ${
          isMine ? "bg-white text-brand" : "bg-brand text-white"
        }`}
        to="/poll"
      >
        투표하러 가기
      </Link>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "잠시 문제가 생겼어요. 다시 시도해주세요.";
}
