import {
  LockKey,
  PaperPlaneTilt,
  PencilSimple,
  SealQuestion,
  Trash,
  User,
  Users,
  UserPlus,
} from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ActionLayer, MobileCreateButton } from "../../components/common/ActionLayer";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { useConfirmDialog } from "../../components/common/confirmDialogContext";
import { Input } from "../../components/common/Input";
import { LoadingState } from "../../components/common/LoadingState";
import { Modal } from "../../components/common/Modal";
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
  getFirstFamilyForUser,
} from "../../features/family/services/familyService";
import type { FamilyMemberProfile } from "../../features/family/types/familyTypes";
import { DatePollPicker } from "../../features/poll/components/DatePollPicker";
import { PollOptionEditor } from "../../features/poll/components/PollOptionEditor";
import { subscribePolls } from "../../features/poll/services/pollService";
import { createPoll } from "../../features/poll/services/pollService";
import type { Poll, PollType } from "../../features/poll/types/pollTypes";

export function ChatPage() {
  const { user } = useAuth();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [activeFamily, setActiveFamily] = useState<{
    id: string;
    inviteCode: string;
    name: string;
  } | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [isFamilyLoading, setIsFamilyLoading] = useState(() => Boolean(user));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<FamilyMemberProfile[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [messageText, setMessageText] = useState("");
  const [privateGroupMemberIds, setPrivateGroupMemberIds] = useState<string[]>([]);
  const [privateGroupName, setPrivateGroupName] = useState("");
  const [secretRoomName, setSecretRoomName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPollCreateOpen, setIsPollCreateOpen] = useState(false);
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
  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === (roomId ?? selectedRoomId)) ?? (!roomId ? rooms[0] : undefined),
    [roomId, rooms, selectedRoomId]
  );
  const normalizedPollOptionCount = pollOptions.filter((option) => option.trim()).length;
  const canCreateRoomPoll =
    Boolean(selectedRoom) &&
    pollTitle.trim().length > 0 &&
    (pollType === "DATE" ? pollDateOptions.length >= 2 : normalizedPollOptionCount >= 2);
  const pollMap = useMemo(
    () => new Map(polls.map((poll) => [poll.id, poll])),
    [polls]
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;
    const userId = user.uid;

    async function loadFamily() {
      setIsFamilyLoading(true);
      const family = await getFirstFamilyForUser(userId);

      if (!active) {
        return;
      }

      setActiveFamily(family);

      if (family) {
        const [familyRoomResult, membersResult] = await Promise.allSettled([
          getOrCreateFamilyRoom({
            createdBy: userId,
            familyId: family.id,
          }),
          getFamilyMembers(family.id),
        ]);

        if (!active) {
          return;
        }

        if (membersResult.status === "fulfilled") {
          setMembers(membersResult.value);
        } else {
          setMembers([]);
          setStatusMessage(getErrorMessage(membersResult.reason));
        }

        if (familyRoomResult.status === "fulfilled") {
          setSelectedRoomId(familyRoomResult.value);
        } else {
          setSelectedRoomId("");
          setStatusMessage(
            `가족 전체방 확인에 실패했습니다. ${getErrorMessage(familyRoomResult.reason)}`
          );
        }
      }

      setIsFamilyLoading(false);
    }

    loadFamily().catch((error: Error) => {
      setIsFamilyLoading(false);
      setStatusMessage(getErrorMessage(error));
    });

    return () => {
      active = false;
    };
  }, [user]);

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
      .catch((error: Error) => setStatusMessage(error.message));

    return () => {
      active = false;
    };
  }, [activeFamily, user]);

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
      notify("1:1 채팅방을 열었습니다.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "1:1 채팅방 생성에 실패했습니다.", "error");
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
      notify("그룹방을 만들었어요.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "그룹방 생성에 실패했습니다.", "error");
    }
  }

  function togglePrivateGroupMember(memberId: string) {
    setPrivateGroupMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((selectedMemberId) => selectedMemberId !== memberId)
        : [...current, memberId]
    );
  }

  useEffect(() => {
    if (!activeFamily || !user) {
      return;
    }

    return subscribeChatRooms({
      familyId: activeFamily.id,
      onChange: setRooms,
      onError: setStatusMessage,
      userId: user.uid,
    });
  }, [activeFamily, user]);

  useEffect(() => {
    if (!activeFamily) {
      return;
    }

    return subscribePolls({
      familyId: activeFamily.id,
      onChange: setPolls,
      onError: setStatusMessage,
    });
  }, [activeFamily]);

  useEffect(() => {
    if (!activeFamily || !selectedRoom) {
      return;
    }

    return subscribeMessages({
      familyId: activeFamily.id,
      onChange: setMessages,
      onError: setStatusMessage,
      roomId: selectedRoom.id,
    });
  }, [activeFamily, selectedRoom]);

  useEffect(() => {
    if (!activeFamily || !user || messages.length === 0) {
      return;
    }

    void markRoomMessagesAsRead({
      familyId: activeFamily.id,
      messages,
      userId: user.uid,
    }).catch((error: Error) => setStatusMessage(error.message));
  }, [activeFamily, messages, user]);

  async function handleCreateSecretRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeFamily || !user) {
      return;
    }

    try {
      const roomId = await createSecretRoom({
        createdBy: user.uid,
        familyId: activeFamily.id,
        name: secretRoomName,
      });
      setSecretRoomName("");
      setSelectedRoomId(roomId);
      openRoom(roomId);
      setIsCreateOpen(false);
      notify("비밀방을 만들었어요.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "비밀방 생성에 실패했습니다.", "error");
    }
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeFamily || !selectedRoom || !user) {
      return;
    }

    try {
      await sendTextMessage({
        createdBy: user.uid,
        familyId: activeFamily.id,
        roomId: selectedRoom.id,
        text: messageText,
      });
      setMessageText("");
      setStatusMessage("");
    } catch (error) {
      notify(error instanceof Error ? error.message : "메시지 전송에 실패했습니다.", "error");
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
      notify("수정할 메시지를 입력해주세요.", "info");
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
      notify("메시지를 수정했습니다.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "메시지 수정에 실패했습니다.", "error");
    }
  }

  async function handleDeleteMessage(message: ChatMessage) {
    if (!activeFamily) {
      return;
    }

    const confirmed = await confirm({
      confirmLabel: "삭제",
      description: "선택한 메시지를 삭제합니다. 삭제한 메시지는 되돌릴 수 없습니다.",
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
      notify("메시지를 삭제했습니다.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "메시지 삭제에 실패했습니다.", "error");
    } finally {
      setBusyMessageId("");
    }
  }

  async function handleCreatePollInRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeFamily || !selectedRoom || !user) {
      notify("채팅방을 먼저 선택해주세요.", "info");
      return;
    }

    try {
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
      notify("투표를 만들고 채팅방에 전송했습니다.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "투표 생성에 실패했습니다.", "error");
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
      notify("채팅방을 삭제했습니다.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "채팅방 삭제에 실패했습니다.", "error");
    }
  }

  function notify(message: string, variant: "error" | "info" | "success") {
    setStatusMessage(message);
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
    return <LoadingState title="채팅 정보를 불러오는 중입니다." />;
  }

  if (!activeFamily) {
    return (
      <Card>
        <h2 className="text-xl font-semibold">채팅</h2>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          홈에서 가족을 만들거나 초대 코드로 참여하면 채팅방을 사용할 수 있어요.
        </p>
      </Card>
    );
  }

  const chatCreateTools = (
    <>
      <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus size={18} weight="bold" />
          가족 초대 코드
        </div>
        <p className="mt-2 font-mono text-2xl font-semibold text-brand">
          {activeFamily.inviteCode}
        </p>
      </div>

      <form className="mt-4 grid gap-2" onSubmit={handleCreateSecretRoom}>
        <Input
          label="비밀방 이름"
          onChange={(event) => setSecretRoomName(event.target.value)}
          placeholder="예: 선물 작전방"
          value={secretRoomName}
        />
        <Button type="submit" variant="secondary">
          <LockKey size={18} weight="bold" />
          비밀방 만들기
        </Button>
      </form>

      <form
        className="mt-6 grid gap-3 border-t border-[var(--color-border)] pt-5"
        onSubmit={handleCreatePrivateGroupRoom}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Users size={18} weight="bold" />
          그룹방 만들기
        </div>
        <Input
          label="그룹방 이름"
          onChange={(event) => setPrivateGroupName(event.target.value)}
          placeholder="예: 주말 준비방"
          value={privateGroupName}
        />
        <div className="grid gap-2">
          {members
            .filter((member) => member.userId !== user?.uid)
            .map((member) => (
              <label
                className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm font-semibold"
                key={member.userId}
              >
                <input
                  checked={privateGroupMemberIds.includes(member.userId)}
                  className="size-4 accent-emerald-500"
                  onChange={() => togglePrivateGroupMember(member.userId)}
                  type="checkbox"
                />
                <span className="min-w-0 truncate">
                  {member.displayName ?? member.nickname}
                </span>
              </label>
            ))}
        </div>
        <Button
          disabled={
            members.filter((member) => member.userId !== user?.uid).length === 0
          }
          type="submit"
          variant="secondary"
        >
          <LockKey size={18} weight="bold" />
          그룹방 만들기
        </Button>
      </form>
    </>
  );

  return (
    <>
      {!roomId ? (
        <MobileCreateButton label="+ 채팅방" onClick={() => setIsCreateOpen(true)} />
      ) : null}
      <ActionLayer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="채팅방 만들기"
      >
        {chatCreateTools}
      </ActionLayer>
      <ActionLayer
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
              className={`h-11 rounded-xl text-sm font-semibold transition ${
                pollType === "GENERAL"
                  ? "bg-brand text-white"
                  : "border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)]"
              }`}
              onClick={() => setPollType("GENERAL")}
              type="button"
            >
              일반
            </button>
            <button
              className={`h-11 rounded-xl text-sm font-semibold transition ${
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
              <input
                checked={pollMultipleChoice}
                className="size-4 accent-emerald-500"
                onChange={(event) => setPollMultipleChoice(event.target.checked)}
                type="checkbox"
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
              제목과 후보 {pollType === "DATE" ? "날짜" : "항목"} 2개 이상이 필요합니다.
            </p>
          ) : null}
        </form>
      </ActionLayer>
      <Modal
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
              className="min-h-28 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base font-normal outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-emerald-100"
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
      </Modal>

    <div className="grid w-full min-w-0 max-w-full gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <Card className={`${roomId ? "hidden lg:block" : ""} min-w-0 overflow-hidden`}>
        <h2 className="text-xl font-semibold">채팅</h2>
        <div className="hidden lg:block">{chatCreateTools}</div>

        <div className="mt-6 border-t border-[var(--color-border)] pt-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <User size={18} weight="bold" />
            1:1 대화
          </div>
          <div className="mt-3 grid gap-2">
            {members.filter((member) => member.userId !== user?.uid).length === 0 ? (
              <p className="rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm text-[var(--color-text-secondary)]">
                다른 가족 구성원이 참여하면 1:1 대화를 시작할 수 있어요.
              </p>
            ) : (
              members
                .filter((member) => member.userId !== user?.uid)
                .map((member) => (
                  <button
                    className="flex w-full min-w-0 items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-3 text-left transition hover:bg-slate-200"
                    key={member.userId}
                    onClick={() => void handleCreateDirectRoom(member)}
                    type="button"
                  >
                    <span className="grid size-9 place-items-center rounded-xl bg-white text-sm font-semibold text-brand">
                      {(member.displayName ?? member.nickname).slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm">
                        {member.displayName ?? member.nickname}
                      </strong>
                      <span className="block truncate text-xs text-[var(--color-text-secondary)]">
                        {member.email ?? "이메일 없음"}
                      </span>
                    </span>
                  </button>
                ))
            )}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {rooms.map((room) => (
            <div
              className={`w-full min-w-0 rounded-2xl p-4 text-left transition ${
                selectedRoom?.id === room.id
                  ? "bg-emerald-50 ring-2 ring-brand"
                  : "bg-[var(--color-surface-muted)] hover:bg-slate-200"
              }`}
              key={room.id}
            >
              <button
                className="w-full min-w-0 text-left"
                onClick={() => openRoom(room.id)}
                type="button"
              >
                <strong className="block truncate">{getRoomDisplayName(room, members, user?.uid)}</strong>
                <p className="mt-1 truncate text-sm text-[var(--color-text-secondary)]">
                  {getRoomTypeLabel(room)} · {room.lastMessageText ?? "아직 대화가 없습니다."}
                </p>
              </button>
              {room.type !== "FAMILY" && room.createdBy === user?.uid ? (
                <div className="mt-3 flex justify-end">
                  <Button
                    onClick={() => void handleDeleteRoom(room)}
                    type="button"
                    variant="secondary"
                  >
                    <Trash size={18} weight="bold" />
                    삭제
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {statusMessage ? (
          <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            {statusMessage}
          </p>
        ) : null}
      </Card>

      <section className={`${roomId ? "block" : "hidden lg:block"} -mx-4 min-w-0 overflow-hidden bg-transparent sm:-mx-6 lg:mx-0 lg:rounded-card lg:border lg:border-[var(--color-border)] lg:bg-[var(--color-surface)] lg:p-4 lg:shadow-sm`}>
        <div className="hidden min-w-0 items-center justify-between gap-3 lg:flex">
          <h3 className="min-w-0 truncate text-lg font-semibold">
            {selectedRoom ? getRoomDisplayName(selectedRoom, members, user?.uid) : "채팅방"}
          </h3>
        </div>
        <div className="flex min-h-[calc(100dvh-152px)] flex-col justify-end gap-3 overflow-y-auto px-4 pb-24 pt-4 sm:px-6 lg:mt-4 lg:min-h-[360px] lg:rounded-2xl lg:bg-slate-50 lg:p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">
              첫 메시지를 보내 가족 대화를 시작해보세요.
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
        <form className="fixed inset-x-0 bottom-0 z-30 flex min-w-0 gap-2 border-t border-white/70 bg-white/85 px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)] shadow-[0_-12px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-6 lg:static lg:mt-4 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none" onSubmit={handleSendMessage}>
          <input
            className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] px-4 outline-none focus:border-brand"
            onChange={(event) => setMessageText(event.target.value)}
            placeholder="메시지 입력"
            value={messageText}
          />
          <button
            aria-label="투표 만들기"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-brand"
            onClick={() => setIsPollCreateOpen(true)}
            type="button"
          >
            <SealQuestion size={21} />
          </button>
          <button
            aria-label="전송"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
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
    return "그룹";
  }

  return "가족";
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
        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-xs font-semibold text-brand shadow-sm">
          {member?.photoURL ? (
            <img
              alt={member.displayName ?? member.nickname}
              className="size-full object-cover"
              src={member.photoURL}
            />
          ) : (
            (member?.displayName ?? member?.nickname ?? "?").slice(0, 1)
          )}
        </span>
      ) : null}
      <div className={`min-w-0 max-w-[78%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {!isMine ? (
          <span className="px-1 text-xs font-normal text-[var(--color-text-secondary)]">
            {member?.displayName ?? member?.nickname ?? "가족"}
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

  return "처리 중 오류가 발생했습니다.";
}
