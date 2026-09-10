import { LockKey, PaperPlaneTilt, User, Users, UserPlus } from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { useAuth } from "../../features/auth/useAuth";
import {
  createPrivateGroupRoom,
  createSecretRoom,
  getOrCreateDirectRoom,
  getOrCreateFamilyRoom,
  markRoomMessagesAsRead,
  sendTextMessage,
  subscribeChatRooms,
  subscribeMessages,
} from "../../features/chat/services/chatService";
import type { ChatMessage, ChatRoom } from "../../features/chat/types/chatTypes";
import {
  getFamilyMembers,
  getFirstFamilyForUser,
} from "../../features/family/services/familyService";
import type { FamilyMemberProfile } from "../../features/family/types/familyTypes";
import { subscribePolls } from "../../features/poll/services/pollService";
import type { Poll } from "../../features/poll/types/pollTypes";

export function ChatPage() {
  const { user } = useAuth();
  const [activeFamily, setActiveFamily] = useState<{
    id: string;
    inviteCode: string;
    name: string;
  } | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<FamilyMemberProfile[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [messageText, setMessageText] = useState("");
  const [privateGroupMemberIds, setPrivateGroupMemberIds] = useState<string[]>([]);
  const [privateGroupName, setPrivateGroupName] = useState("");
  const [secretRoomName, setSecretRoomName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? rooms[0],
    [rooms, selectedRoomId]
  );
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
      const family = await getFirstFamilyForUser(userId);

      if (!active) {
        return;
      }

      setActiveFamily(family);

      if (family) {
        const [familyRoomId, nextMembers] = await Promise.all([
          getOrCreateFamilyRoom({
            createdBy: userId,
            familyId: family.id,
          }),
          getFamilyMembers(family.id),
        ]);

        if (active) {
          setMembers(nextMembers);
          setSelectedRoomId(familyRoomId);
        }
      }
    }

    loadFamily().catch((error: Error) => setStatusMessage(error.message));

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
      setStatusMessage("1:1 채팅방을 열었습니다.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "1:1 채팅방 생성에 실패했습니다.");
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
      setStatusMessage("그룹방을 만들었어요.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "그룹방 생성에 실패했습니다.");
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
    });
  }, [activeFamily]);

  useEffect(() => {
    if (!selectedRoom) {
      return;
    }

    return subscribeMessages({
      onChange: setMessages,
      roomId: selectedRoom.id,
    });
  }, [selectedRoom]);

  useEffect(() => {
    if (!user || messages.length === 0) {
      return;
    }

    void markRoomMessagesAsRead({
      messages,
      userId: user.uid,
    }).catch((error: Error) => setStatusMessage(error.message));
  }, [messages, user]);

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
      setStatusMessage("비밀방을 만들었어요.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "비밀방 생성에 실패했습니다.");
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
      setStatusMessage(error instanceof Error ? error.message : "메시지 전송에 실패했습니다.");
    }
  }

  if (!activeFamily) {
    return (
      <Card>
        <h2 className="text-xl font-black">채팅</h2>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          홈에서 가족을 만들거나 초대 코드로 참여하면 채팅방을 사용할 수 있어요.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <h2 className="text-xl font-black">채팅</h2>
        <div className="mt-4 rounded-2xl bg-[var(--color-surface-muted)] p-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <UserPlus size={18} weight="bold" />
            가족 초대 코드
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-brand">
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

        <div className="mt-6 border-t border-[var(--color-border)] pt-5">
          <div className="flex items-center gap-2 text-sm font-bold">
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
                    className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-3 text-left transition hover:bg-slate-200"
                    key={member.userId}
                    onClick={() => void handleCreateDirectRoom(member)}
                    type="button"
                  >
                    <span className="grid size-9 place-items-center rounded-xl bg-white text-sm font-black text-brand">
                      {(member.displayName ?? member.nickname).slice(0, 1)}
                    </span>
                    <span className="min-w-0">
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

        <form
          className="mt-6 grid gap-3 border-t border-[var(--color-border)] pt-5"
          onSubmit={handleCreatePrivateGroupRoom}
        >
          <div className="flex items-center gap-2 text-sm font-bold">
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

        <div className="mt-6 space-y-3">
          {rooms.map((room) => (
            <button
              className={`w-full rounded-2xl p-4 text-left transition ${
                selectedRoom?.id === room.id
                  ? "bg-emerald-50 ring-2 ring-brand"
                  : "bg-[var(--color-surface-muted)] hover:bg-slate-200"
              }`}
              key={room.id}
              onClick={() => setSelectedRoomId(room.id)}
              type="button"
            >
              <strong>{getRoomDisplayName(room, members, user?.uid)}</strong>
              <p className="mt-1 truncate text-sm text-[var(--color-text-secondary)]">
                {getRoomTypeLabel(room)} · {room.lastMessageText ?? "아직 대화가 없습니다."}
              </p>
            </button>
          ))}
        </div>

        {statusMessage ? (
          <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            {statusMessage}
          </p>
        ) : null}
      </Card>

      <Card className="min-h-[520px]">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold">
            {selectedRoom ? getRoomDisplayName(selectedRoom, members, user?.uid) : "채팅방"}
          </h3>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm font-bold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)]"
            to="/poll"
          >
            투표 만들기
          </Link>
        </div>
        <div className="mt-4 flex min-h-[360px] flex-col justify-end gap-3 rounded-2xl bg-slate-50 p-4">
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
                  {message.type === "POLL" ? (
                    <PollMessageCard
                      isMine={isMine}
                      message={message}
                      poll={message.pollId ? pollMap.get(message.pollId) : undefined}
                    />
                  ) : (
                    <p
                      className={`max-w-[280px] rounded-2xl p-3 text-sm shadow-sm ${
                        isMine ? "bg-brand text-white" : "bg-white"
                      }`}
                    >
                      {message.text}
                    </p>
                  )}
                  <span className="px-2 text-[10px] font-bold text-[var(--color-text-secondary)]">
                    {isMine ? `읽음 ${readCount}명` : message.readBy.includes(user?.uid ?? "") ? "읽음" : "안 읽음"}
                  </span>
                </div>
              );
            })
          )}
        </div>
        <form className="mt-4 flex gap-2" onSubmit={handleSendMessage}>
          <input
            className="h-11 flex-1 rounded-xl border border-[var(--color-border)] px-4 text-sm outline-none focus:border-brand"
            onChange={(event) => setMessageText(event.target.value)}
            placeholder="메시지 입력"
            value={messageText}
          />
          <Button disabled={!selectedRoom} type="submit">
            <PaperPlaneTilt size={18} weight="bold" />
            전송
          </Button>
        </form>
      </Card>
    </div>
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
      <p className="text-xs font-bold opacity-80">채팅방 투표</p>
      <strong className="mt-1 block">{poll?.title ?? message.text.replace("투표: ", "")}</strong>
      <p className={`mt-2 text-xs ${isMine ? "text-emerald-50" : "text-[var(--color-text-secondary)]"}`}>
        {poll ? `${poll.options.length}개 보기 · ${poll.multipleChoice ? "복수 선택" : "단일 선택"}` : "투표 메뉴에서 확인"}
      </p>
      <Link
        className={`mt-3 inline-flex h-9 items-center rounded-xl px-3 text-xs font-bold ${
          isMine ? "bg-white text-brand" : "bg-brand text-white"
        }`}
        to="/poll"
      >
        투표하러 가기
      </Link>
    </div>
  );
}
